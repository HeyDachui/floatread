import { buildPrompt } from "../prompts/build-prompt";
import { validateProviderUrl } from "../providers/config";
import { streamMockResult } from "../providers/mock";
import { streamWithSingleRetry } from "../providers/router";
import { ProviderFailure } from "../providers/types";
import { publicError } from "../shared/errors";
import {
  GENERATION_PORT_NAME,
  generationPortIncomingSchema,
  type GenerationPortIncoming,
  type GenerationPortOutgoing,
} from "../shared/messages";
import { getActiveProviderProfile } from "../storage/providers";
import { getProviderSecret } from "../storage/secrets";

interface ActiveRequest {
  requestId: string;
  tabId: number;
  controller: AbortController;
  abortReason: "user" | "timeout" | null;
}

type StartMessage = Extract<GenerationPortIncoming, { type: "GENERATE_START" }>;

const activeByRequest = new Map<string, ActiveRequest>();
const activeByTab = new Map<number, string>();
const GLOBAL_REQUEST_LIMIT = 3;

function post(port: chrome.runtime.Port, message: GenerationPortOutgoing): void {
  try {
    port.postMessage(message);
  } catch {
    // The tab may have closed; cleanup still happens in finally or onDisconnect.
  }
}

async function runProviderRequest(
  port: chrome.runtime.Port,
  request: ActiveRequest,
  message: StartMessage,
): Promise<void> {
  const profile = await getActiveProviderProfile();
  if (!profile?.enabled) {
    throw new ProviderFailure({
      ...publicError("PROVIDER_NOT_CONFIGURED", "请先配置并启用 AI Provider。"),
      suggestion: "打开 FloatRead 设置并完成连接测试。",
    });
  }
  const providerUrl = validateProviderUrl(profile);
  if (!providerUrl.valid) throw new ProviderFailure(providerUrl.error);
  if (!(await chrome.permissions.contains({ origins: [providerUrl.permission] }))) {
    throw new ProviderFailure(
      publicError("HOST_PERMISSION_DENIED", "尚未授权访问此 Provider 域名。"),
    );
  }
  const prompt = buildPrompt(message.mode, message.text);
  const timer = setTimeout(() => {
    request.abortReason = "timeout";
    request.controller.abort();
  }, profile.timeoutMs);
  try {
    for await (const event of streamWithSingleRetry(
      {
        requestId: request.requestId,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        maxOutputTokens: prompt.maxOutputTokens,
      },
      profile,
      await getProviderSecret(profile.id, profile.secretStorageMode),
      request.controller.signal,
    )) {
      if (event.type === "start") {
        post(port, {
          type: "STREAM_START",
          requestId: request.requestId,
          cached: false,
          providerLabel: profile.displayName,
        });
      } else if (event.type === "delta") {
        post(port, { type: "STREAM_DELTA", requestId: request.requestId, text: event.text });
      } else if (event.type === "done") {
        post(port, { type: "STREAM_DONE", requestId: request.requestId });
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

async function runRequest(
  port: chrome.runtime.Port,
  request: ActiveRequest,
  message: StartMessage,
): Promise<void> {
  try {
    if (__FLOATREAD_MOCK_PROVIDER__) {
      await runMockRequest(port, request, message);
      return;
    }
    await runProviderRequest(port, request, message);
  } catch (error) {
    const failure =
      error instanceof ProviderFailure
        ? error.publicError
        : error instanceof DOMException && error.name === "AbortError"
          ? request.abortReason === "timeout"
            ? publicError("TIMEOUT", "Provider 请求超时。", true)
            : publicError("ABORTED", "请求已停止。")
          : publicError("UNKNOWN", "Provider 请求失败。", true);
    post(port, { type: "STREAM_ERROR", requestId: request.requestId, error: failure });
  } finally {
    cleanup(request.requestId);
  }
}

function cleanup(requestId: string): void {
  const request = activeByRequest.get(requestId);
  if (!request) return;
  activeByRequest.delete(requestId);
  if (activeByTab.get(request.tabId) === requestId) activeByTab.delete(request.tabId);
}

async function runMockRequest(
  port: chrome.runtime.Port,
  request: ActiveRequest,
  message: StartMessage,
): Promise<void> {
  const prompt = buildPrompt(message.mode, message.text);
  if (prompt.systemPrompt.length === 0 || prompt.userPrompt.length === 0) {
    post(port, {
      type: "STREAM_ERROR",
      requestId: request.requestId,
      error: publicError("INVALID_RESPONSE", "Prompt 构建失败。"),
    });
    cleanup(request.requestId);
    return;
  }

  post(port, {
    type: "STREAM_START",
    requestId: request.requestId,
    cached: false,
    providerLabel: "Mock Provider",
  });
  try {
    for await (const delta of streamMockResult(
      message.mode,
      message.text,
      request.controller.signal,
    )) {
      post(port, { type: "STREAM_DELTA", requestId: request.requestId, text: delta });
    }
    post(port, { type: "STREAM_DONE", requestId: request.requestId });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      post(port, {
        type: "STREAM_ERROR",
        requestId: request.requestId,
        error: publicError("ABORTED", "请求已停止。"),
      });
    } else {
      post(port, {
        type: "STREAM_ERROR",
        requestId: request.requestId,
        error: publicError("UNKNOWN", "Mock 请求失败。", true),
      });
    }
  } finally {
    if (__FLOATREAD_MOCK_PROVIDER__) cleanup(request.requestId);
  }
}

function start(port: chrome.runtime.Port, tabId: number, message: StartMessage): void {
  if (activeByTab.has(tabId)) {
    post(port, {
      type: "STREAM_ERROR",
      requestId: message.requestId,
      error: publicError("PROVIDER_ERROR", "当前标签页已有一个请求正在进行。"),
    });
    return;
  }
  if (activeByRequest.size >= GLOBAL_REQUEST_LIMIT) {
    post(port, {
      type: "STREAM_ERROR",
      requestId: message.requestId,
      error: publicError("RATE_LIMITED", "FloatRead 当前请求较多，请稍后重试。", true),
    });
    return;
  }

  const request: ActiveRequest = {
    requestId: message.requestId,
    tabId,
    controller: new AbortController(),
    abortReason: null,
  };
  activeByRequest.set(request.requestId, request);
  activeByTab.set(tabId, request.requestId);
  void runRequest(port, request, message);
}

export function registerGenerationPorts(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== GENERATION_PORT_NAME || port.sender?.id !== chrome.runtime.id) return;
    const tabId = port.sender.tab?.id;
    if (typeof tabId !== "number") return;

    port.onMessage.addListener((rawMessage: unknown) => {
      const parsed = generationPortIncomingSchema.safeParse(rawMessage);
      if (!parsed.success) return;
      if (parsed.data.type === "GENERATE_CANCEL") {
        const request = activeByRequest.get(parsed.data.requestId);
        if (request) {
          request.abortReason = "user";
          request.controller.abort();
        }
        return;
      }
      start(port, tabId, parsed.data);
    });
    port.onDisconnect.addListener(() => {
      const requestId = activeByTab.get(tabId);
      if (requestId) {
        const request = activeByRequest.get(requestId);
        if (request) {
          request.abortReason = "user";
          request.controller.abort();
        }
      }
    });
  });
}
