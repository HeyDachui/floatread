import { ProviderFailure } from "../providers/types";
import { publicError } from "../shared/errors";
import type { ProviderStreamEvent } from "../providers/types";
import { parseCompletedPageTranslationItems, parsePageTranslationResponse } from "./prompt";

export async function completePageTranslationWithSingleRetry(
  complete: () => Promise<string>,
  expectedIds: string[],
  signal: AbortSignal,
): Promise<Map<string, string>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = parsePageTranslationResponse(await complete(), expectedIds);
      if (parsed) return parsed;
      lastError = new ProviderFailure(
        publicError("INVALID_RESPONSE", "页面翻译返回格式异常，请重试。", true),
      );
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof ProviderFailure && !error.publicError.retryable) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

export async function streamPageTranslationWithSingleRetry(
  stream: () => AsyncGenerator<ProviderStreamEvent>,
  expectedIds: string[],
  signal: AbortSignal,
  onTranslation: (id: string, text: string) => Promise<void> | void,
  onUsage: (inputTokens?: number, outputTokens?: number) => Promise<void> | void,
): Promise<Map<string, string>> {
  let lastError: unknown;
  const emittedIds = new Set<string>();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw = "";
    try {
      for await (const event of stream()) {
        if (event.type === "usage") {
          await onUsage(event.inputTokens, event.outputTokens);
          continue;
        }
        if (event.type !== "delta") continue;
        raw += event.text;
        for (const [id, text] of parseCompletedPageTranslationItems(raw, expectedIds)) {
          if (emittedIds.has(id)) continue;
          emittedIds.add(id);
          await onTranslation(id, text);
        }
      }
      const parsed = parsePageTranslationResponse(raw, expectedIds);
      if (parsed) return parsed;
      lastError = new ProviderFailure(
        publicError("INVALID_RESPONSE", "页面翻译返回格式异常，请重试。", true),
      );
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof ProviderFailure && !error.publicError.retryable) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
