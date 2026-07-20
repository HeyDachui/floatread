import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { ollamaAdapter } from "./ollama";
import { openAiAdapter } from "./openai";
import { deepSeekAdapter, openAiCompatibleAdapter } from "./openai-compatible";
import {
  ProviderFailure,
  type ProviderAdapter,
  type ProviderKind,
  type ProviderProfile,
  type ProviderRequest,
  type ProviderStreamEvent,
} from "./types";

const ADAPTERS: Record<ProviderKind, ProviderAdapter> = {
  openai: openAiAdapter,
  openai_compatible: openAiCompatibleAdapter,
  deepseek: deepSeekAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  ollama: ollamaAdapter,
};

export function getProviderAdapter(kind: ProviderKind): ProviderAdapter {
  return ADAPTERS[kind];
}

export async function* streamWithSingleRetry(
  request: ProviderRequest,
  profile: ProviderProfile,
  apiKey: string | undefined,
  signal: AbortSignal,
): AsyncGenerator<ProviderStreamEvent> {
  const adapter = getProviderAdapter(profile.kind);
  let attempt = 0;
  let emittedText = false;
  while (attempt < 2) {
    try {
      for await (const event of adapter.stream(request, profile, apiKey, signal)) {
        if (event.type === "delta") emittedText = true;
        yield event;
      }
      return;
    } catch (error) {
      const canRetry =
        attempt === 0 &&
        !emittedText &&
        error instanceof ProviderFailure &&
        error.publicError.retryable &&
        !signal.aborted;
      if (!canRetry) throw error;
      attempt += 1;
    }
  }
}
