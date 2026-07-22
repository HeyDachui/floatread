import {
  GENERATION_PORT_NAME,
  generationPortOutgoingSchema,
  type GenerationPortOutgoing,
} from "../shared/messages";
import { publicError } from "../shared/errors";
import type { ReaderMode } from "../shared/types";

export interface GenerationClient {
  start(requestId: string, text: string, mode: ReaderMode): void;
  cancel(requestId: string): void;
  dispose(): void;
}

export function createGenerationClient(
  onEvent: (event: GenerationPortOutgoing) => void,
): GenerationClient {
  let port: chrome.runtime.Port | null = null;
  let activeRequestId: string | null = null;
  let disposed = false;

  const connect = (): chrome.runtime.Port => {
    if (port) return port;
    const connectedPort = chrome.runtime.connect({ name: GENERATION_PORT_NAME });
    port = connectedPort;
    connectedPort.onMessage.addListener((message: unknown) => {
      const parsed = generationPortOutgoingSchema.safeParse(message);
      if (!parsed.success) return;
      if (
        parsed.data.requestId === activeRequestId &&
        (parsed.data.type === "STREAM_DONE" || parsed.data.type === "STREAM_ERROR")
      ) {
        activeRequestId = null;
      }
      onEvent(parsed.data);
    });
    connectedPort.onDisconnect.addListener(() => {
      if (port !== connectedPort) return;
      port = null;
      if (disposed || !activeRequestId) return;
      const requestId = activeRequestId;
      activeRequestId = null;
      onEvent({
        type: "STREAM_ERROR",
        requestId,
        error: {
          ...publicError("PROVIDER_ERROR", "精读连接已断开，请重试。", true),
          suggestion: "点击重试会建立新连接；停止按钮仍可立即结束当前状态。",
        },
      });
    });
    return connectedPort;
  };

  const safePost = (message: Parameters<chrome.runtime.Port["postMessage"]>[0]): boolean => {
    try {
      connect().postMessage(message);
      return true;
    } catch {
      port = null;
      return false;
    }
  };

  return {
    start: (requestId, text, mode) => {
      activeRequestId = requestId;
      if (!safePost({ type: "GENERATE_START", requestId, text, mode })) {
        activeRequestId = null;
        onEvent({
          type: "STREAM_ERROR",
          requestId,
          error: publicError("PROVIDER_ERROR", "无法连接精读服务，请重试。", true),
        });
      }
    },
    cancel: (requestId) => {
      if (activeRequestId === requestId) activeRequestId = null;
      if (!port) return;
      try {
        port.postMessage({ type: "GENERATE_CANCEL", requestId });
      } catch {
        port = null;
      }
    },
    dispose: () => {
      disposed = true;
      activeRequestId = null;
      try {
        port?.disconnect();
      } catch {
        // A dead Port is already disposed from the page's perspective.
      }
      port = null;
    },
  };
}
