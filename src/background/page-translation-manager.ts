import { createCacheKey } from "../cache/key";
import {
  buildPageTranslationPrompt,
  PAGE_TRANSLATION_PROMPT_VERSION,
  parsePageTranslationResponse,
} from "../page-translation/prompt";
import { validateProviderUrl } from "../providers/config";
import { getProviderAdapter } from "../providers/router";
import { ProviderFailure } from "../providers/types";
import { publicError } from "../shared/errors";
import {
  PAGE_TRANSLATION_PORT_NAME,
  pageTranslationPortIncomingSchema,
  type PageTranslationPortOutgoing,
} from "../shared/messages";
import { getPageTranslationMemory, putPageTranslationMemory } from "../storage/page-translation";
import { getActiveProviderProfile } from "../storage/providers";
import { getProviderSecret } from "../storage/secrets";

interface ActivePageJob {
  jobId: string;
  tabId: number;
  controller: AbortController;
}

const activeByTab = new Map<number, ActivePageJob>();

function post(port: chrome.runtime.Port, message: PageTranslationPortOutgoing): void {
  try {
    port.postMessage(message);
  } catch {
    // The page can disappear while a batch is finishing.
  }
}

async function runMockBatch(
  port: chrome.runtime.Port,
  job: ActivePageJob,
  segments: Array<{ id: string; text: string; kind: "content" | "ui" }>,
): Promise<void> {
  post(port, { type: "PAGE_BATCH_START", jobId: job.jobId });
  for (const segment of segments) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 35);
      job.controller.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("aborted", "AbortError"));
        },
        { once: true },
      );
    });
    const text =
      segment.text === "We reset usage limits for affected Codex users."
        ? "我们已重置受影响的 Codex 用户的使用限额。"
        : segment.text === "Account settings"
          ? "账户设置"
          : `页面译文：${segment.text}`;
    post(port, {
      type: "PAGE_SEGMENT_RESULT",
      jobId: job.jobId,
      id: segment.id,
      text,
      cached: false,
    });
  }
  post(port, { type: "PAGE_BATCH_DONE", jobId: job.jobId });
}

async function runBatch(
  port: chrome.runtime.Port,
  job: ActivePageJob,
  segments: Array<{ id: string; text: string; kind: "content" | "ui" }>,
): Promise<void> {
  if (__FLOATREAD_MOCK_PROVIDER__) {
    await runMockBatch(port, job, segments);
    return;
  }
  post(port, { type: "PAGE_BATCH_START", jobId: job.jobId });
  const profile = await getActiveProviderProfile();
  if (!profile?.enabled) {
    throw new ProviderFailure(
      publicError("PROVIDER_NOT_CONFIGURED", "请先配置并启用 AI Provider。"),
    );
  }
  const providerUrl = validateProviderUrl(profile);
  if (!providerUrl.valid) throw new ProviderFailure(providerUrl.error);
  if (!(await chrome.permissions.contains({ origins: [providerUrl.permission] }))) {
    throw new ProviderFailure(
      publicError("HOST_PERMISSION_DENIED", "尚未授权访问此 Provider 域名。"),
    );
  }

  const keyed = await Promise.all(
    segments.map(async (segment) => ({
      segment,
      key: await createCacheKey({
        normalizedText: `${segment.kind}\u0000${segment.text}`,
        mode: "natural_zh",
        providerKind: profile.kind,
        providerBaseUrl: profile.baseUrl,
        model: profile.model,
        promptVersion: PAGE_TRANSLATION_PROMPT_VERSION,
      }),
    })),
  );
  const memory = await getPageTranslationMemory(keyed.map((item) => item.key));
  const misses: typeof keyed = [];
  for (const item of keyed) {
    const cached = memory.get(item.key);
    if (cached) {
      post(port, {
        type: "PAGE_SEGMENT_RESULT",
        jobId: job.jobId,
        id: item.segment.id,
        text: cached,
        cached: true,
      });
    } else misses.push(item);
  }

  if (misses.length > 0) {
    const prompt = buildPageTranslationPrompt(misses.map((item) => item.segment));
    const timer = setTimeout(() => job.controller.abort(), profile.timeoutMs);
    try {
      const completion = await getProviderAdapter(profile.kind).complete(
        {
          requestId: job.jobId,
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          maxOutputTokens: prompt.maxOutputTokens,
          temperature: 0,
          responseFormat: "json_object",
        },
        profile,
        await getProviderSecret(profile.id, profile.secretStorageMode),
        job.controller.signal,
      );
      const results = parsePageTranslationResponse(
        completion.text,
        misses.map((item) => item.segment.id),
      );
      if (!results) {
        throw new ProviderFailure(
          publicError("INVALID_RESPONSE", "页面翻译返回格式异常，请重试。", true),
        );
      }
      const memoryWrites: Array<{ key: string; translation: string }> = [];
      for (const item of misses) {
        const translated = results.get(item.segment.id);
        if (!translated) continue;
        memoryWrites.push({ key: item.key, translation: translated });
        post(port, {
          type: "PAGE_SEGMENT_RESULT",
          jobId: job.jobId,
          id: item.segment.id,
          text: translated,
          cached: false,
        });
      }
      await putPageTranslationMemory(memoryWrites);
    } finally {
      clearTimeout(timer);
    }
  }
  post(port, { type: "PAGE_BATCH_DONE", jobId: job.jobId });
}

async function executeBatch(
  port: chrome.runtime.Port,
  job: ActivePageJob,
  segments: Array<{ id: string; text: string; kind: "content" | "ui" }>,
): Promise<void> {
  try {
    await runBatch(port, job, segments);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      post(port, { type: "PAGE_BATCH_CANCELLED", jobId: job.jobId });
    } else {
      post(port, {
        type: "PAGE_BATCH_ERROR",
        jobId: job.jobId,
        error:
          error instanceof ProviderFailure
            ? error.publicError
            : publicError("UNKNOWN", "页面翻译失败，请稍后重试。", true),
      });
    }
  } finally {
    if (activeByTab.get(job.tabId)?.jobId === job.jobId) activeByTab.delete(job.tabId);
  }
}

export function registerPageTranslationPorts(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PAGE_TRANSLATION_PORT_NAME || port.sender?.id !== chrome.runtime.id) return;
    const tabId = port.sender.tab?.id;
    if (typeof tabId !== "number") return;

    port.onMessage.addListener((rawMessage: unknown) => {
      const parsed = pageTranslationPortIncomingSchema.safeParse(rawMessage);
      if (!parsed.success) return;
      const message = parsed.data;
      if (message.type === "PAGE_TRANSLATE_CANCEL") {
        const active = activeByTab.get(tabId);
        if (active?.jobId === message.jobId) active.controller.abort();
        return;
      }
      activeByTab.get(tabId)?.controller.abort();
      const job: ActivePageJob = {
        jobId: message.jobId,
        tabId,
        controller: new AbortController(),
      };
      activeByTab.set(tabId, job);
      void executeBatch(port, job, message.segments);
    });

    port.onDisconnect.addListener(() => {
      activeByTab.get(tabId)?.controller.abort();
      activeByTab.delete(tabId);
    });
  });
}
