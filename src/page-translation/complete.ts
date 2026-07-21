import { ProviderFailure } from "../providers/types";
import { publicError } from "../shared/errors";
import { parsePageTranslationResponse } from "./prompt";

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
