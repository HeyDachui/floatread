import { createCacheKey } from "../cache/key";
import {
  buildPageTranslationPrompt,
  PAGE_TRANSLATION_PROMPT_VERSION,
} from "../page-translation/prompt";
import { streamPageTranslationWithSingleRetry } from "../page-translation/complete";
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
import { getSettings } from "../storage/settings";
import { addUsage, endUsageSession, startUsageSession } from "../storage/usage";
import type { TranslationLanguage, TranslationPreferences } from "../translation/languages";

interface PageBatchSegment {
  id: string;
  text: string;
  kind: "content" | "ui";
  sourceLanguage: TranslationLanguage;
}

interface ActivePageJob {
  jobId: string;
  tabId: number;
  controller: AbortController;
  sessionId: string;
  translation: TranslationPreferences;
}

const activeByTab = new Map<number, ActivePageJob>();
interface ActiveUsageSession {
  id: string;
  translation: TranslationPreferences;
  ready: Promise<void>;
}

const sessionsByTab = new Map<number, ActiveUsageSession>();
const PAGE_JOB_HEARTBEAT_MS = 10_000;

export function cancelPageTranslationForTab(tabId: number): void {
  activeByTab.get(tabId)?.controller.abort();
}

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
  segments: PageBatchSegment[],
): Promise<void> {
  if (segments.some((segment) => segment.text === "FloatRead mock page error.")) {
    throw new ProviderFailure(
      publicError(
        "SECRET_REQUIRED",
        "未找到 API Key。若使用“仅本次会话”或“每次输入”，请在设置中重新输入。",
        false,
      ),
    );
  }
  await addUsage(job.sessionId, { requests: 1, usageAvailable: false });
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
  await addUsage(job.sessionId, { translatedSegments: segments.length });
  post(port, { type: "PAGE_BATCH_DONE", jobId: job.jobId });
}

async function runBatch(
  port: chrome.runtime.Port,
  job: ActivePageJob,
  segments: PageBatchSegment[],
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
        normalizedText: `${segment.kind}\u0000${segment.sourceLanguage}\u0000${job.translation.targetLanguage}\u0000${segment.text}`,
        mode: "natural_zh",
        providerKind: profile.kind,
        providerBaseUrl: profile.baseUrl,
        model: profile.model,
        promptVersion: `${PAGE_TRANSLATION_PROMPT_VERSION}-${job.translation.quality}`,
      }),
    })),
  );
  const settings = await getSettings();
  const memory = await getPageTranslationMemory(
    keyed.map((item) => item.key),
    settings.cache,
  );
  const misses: typeof keyed = [];
  let cacheHits = 0;
  for (const item of keyed) {
    const cached = memory.get(item.key);
    if (cached) {
      cacheHits += 1;
      post(port, {
        type: "PAGE_SEGMENT_RESULT",
        jobId: job.jobId,
        id: item.segment.id,
        text: cached,
        cached: true,
      });
    } else misses.push(item);
  }
  if (cacheHits > 0) {
    await addUsage(job.sessionId, { cacheHits, translatedSegments: cacheHits });
  }

  if (misses.length > 0) {
    const prompt = buildPageTranslationPrompt(
      misses.map((item) => item.segment),
      job.translation.targetLanguage,
      job.translation.quality,
    );
    const timer = setTimeout(() => job.controller.abort(), profile.timeoutMs);
    const heartbeat = setInterval(
      () => post(port, { type: "PAGE_BATCH_PROGRESS", jobId: job.jobId }),
      PAGE_JOB_HEARTBEAT_MS,
    );
    try {
      const adapter = getProviderAdapter(profile.kind);
      const secret = await getProviderSecret(profile.id, profile.secretStorageMode);
      const streamedIds = new Set<string>();
      const results = await streamPageTranslationWithSingleRetry(
        async function* () {
          await addUsage(job.sessionId, { requests: 1 });
          yield* adapter.stream(
            {
              requestId: job.jobId,
              systemPrompt: prompt.systemPrompt,
              userPrompt: prompt.userPrompt,
              maxOutputTokens: prompt.maxOutputTokens,
              temperature: 0,
              responseFormat: "json_object",
            },
            profile,
            secret,
            job.controller.signal,
          );
        },
        misses.map((item) => item.segment.id),
        job.controller.signal,
        (id, text) => {
          streamedIds.add(id);
          post(port, {
            type: "PAGE_SEGMENT_RESULT",
            jobId: job.jobId,
            id,
            text,
            cached: false,
          });
        },
        async (inputTokens, outputTokens) => {
          await addUsage(job.sessionId, {
            inputTokens: inputTokens ?? 0,
            outputTokens: outputTokens ?? 0,
            usageAvailable: inputTokens !== undefined && outputTokens !== undefined,
          });
        },
      );
      const memoryWrites: Array<{
        key: string;
        translation: string;
        sourceLength: number;
        kind: "content" | "ui";
      }> = [];
      for (const item of misses) {
        const translated = results.get(item.segment.id);
        if (!translated) continue;
        memoryWrites.push({
          key: item.key,
          translation: translated,
          sourceLength: item.segment.text.length,
          kind: item.segment.kind,
        });
        if (!streamedIds.has(item.segment.id)) {
          post(port, {
            type: "PAGE_SEGMENT_RESULT",
            jobId: job.jobId,
            id: item.segment.id,
            text: translated,
            cached: false,
          });
        }
      }
      await putPageTranslationMemory(memoryWrites, settings.cache);
      await addUsage(job.sessionId, { translatedSegments: memoryWrites.length });
    } finally {
      clearInterval(heartbeat);
      clearTimeout(timer);
    }
  }
  post(port, { type: "PAGE_BATCH_DONE", jobId: job.jobId });
}

async function executeBatch(
  port: chrome.runtime.Port,
  job: ActivePageJob,
  segments: PageBatchSegment[],
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

    const handleMessage = async (rawMessage: unknown): Promise<void> => {
      const parsed = pageTranslationPortIncomingSchema.safeParse(rawMessage);
      if (!parsed.success) return;
      const message = parsed.data;
      if (message.type === "PAGE_TRANSLATION_SESSION_START") {
        const previous = sessionsByTab.get(tabId);
        const ready = (async () => {
          if (previous && previous.id !== message.sessionId) {
            await previous.ready;
            await endUsageSession(previous.id, "page_closed");
          }
          const profile = await getActiveProviderProfile();
          await startUsageSession({
            id: message.sessionId,
            provider: profile?.displayName ?? "未配置",
            model: profile?.model ?? "未配置",
            sourceLanguages: message.translation.sourceLanguages,
            targetLanguage: message.translation.targetLanguage,
          });
        })();
        sessionsByTab.set(tabId, {
          id: message.sessionId,
          translation: message.translation,
          ready,
        });
        await ready;
        return;
      }
      if (message.type === "PAGE_TRANSLATION_SESSION_END") {
        const current = sessionsByTab.get(tabId);
        if (current?.id === message.sessionId) {
          await current.ready;
          await endUsageSession(message.sessionId, message.reason);
          sessionsByTab.delete(tabId);
        }
        return;
      }
      if (message.type === "PAGE_TRANSLATE_CANCEL") {
        const active = activeByTab.get(tabId);
        if (active?.jobId === message.jobId) active.controller.abort();
        return;
      }
      activeByTab.get(tabId)?.controller.abort();
      const session = sessionsByTab.get(tabId);
      if (session?.id === message.sessionId) await session.ready;
      const job: ActivePageJob = {
        jobId: message.jobId,
        tabId,
        controller: new AbortController(),
        sessionId: message.sessionId,
        translation:
          session?.id === message.sessionId
            ? session.translation
            : { sourceLanguages: ["en"], targetLanguage: "zh-Hans", quality: "smart" },
      };
      activeByTab.set(tabId, job);
      void executeBatch(port, job, message.segments);
    };

    port.onMessage.addListener((rawMessage: unknown) => {
      void handleMessage(rawMessage).catch(() => {
        post(port, {
          type: "PAGE_BATCH_ERROR",
          jobId:
            typeof rawMessage === "object" && rawMessage !== null && "jobId" in rawMessage
              ? String(rawMessage.jobId)
              : crypto.randomUUID(),
          error: publicError("UNKNOWN", "页面翻译状态无法更新，请重新开始。", true),
        });
      });
    });

    port.onDisconnect.addListener(() => {
      activeByTab.get(tabId)?.controller.abort();
      activeByTab.delete(tabId);
      const session = sessionsByTab.get(tabId);
      sessionsByTab.delete(tabId);
      if (session) void session.ready.then(() => endUsageSession(session.id, "page_closed"));
    });
  });
}
