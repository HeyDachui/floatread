import {
  buildPageTranslationPrompt,
  parsePageTranslationResponse,
} from "../src/page-translation/prompt";
import { deepSeekAdapter } from "../src/providers/openai-compatible";
import { ProviderFailure, type ProviderProfile } from "../src/providers/types";

const key = process.env.FLOATREAD_TEST_DEEPSEEK_KEY?.trim();
const baseUrl = process.env.FLOATREAD_TEST_BASE_URL?.trim() || "https://api.deepseek.com";
const model = process.env.FLOATREAD_TEST_MODEL?.trim() || "deepseek-v4-flash";

if (!key) {
  throw new Error("FLOATREAD_TEST_DEEPSEEK_KEY is required; the value will not be logged.");
}

const profile: ProviderProfile = {
  id: "page-smoke-deepseek",
  displayName: "DeepSeek",
  kind: "deepseek",
  baseUrl,
  model,
  secretStorageMode: "prompt_each_time",
  timeoutMs: 30_000,
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
};
const segments = [
  { id: "ui_0", kind: "ui" as const, text: "Account settings", sourceLanguage: "en" as const },
  {
    id: "content_0",
    kind: "content" as const,
    text: "We reset usage limits for affected Codex users.",
    sourceLanguage: "en" as const,
  },
];
const prompt = buildPageTranslationPrompt(segments);
const started = performance.now();

try {
  const completion = await deepSeekAdapter.complete(
    {
      requestId: "page-smoke-generation",
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      maxOutputTokens: prompt.maxOutputTokens,
      temperature: 0,
      responseFormat: "json_object",
    },
    profile,
    key,
    new AbortController().signal,
  );
  const parsed = parsePageTranslationResponse(
    completion.text,
    segments.map((segment) => segment.id),
  );
  const success = parsed !== null;
  console.log(
    JSON.stringify(
      {
        provider: "DeepSeek",
        model,
        check: "page_translation_batch",
        success,
        durationMs: Math.round(performance.now() - started),
        result: success ? "strict_json_batch_received" : "INVALID_RESPONSE",
        segmentCount: parsed?.size ?? 0,
        outputCharacters: parsed ? [...parsed.values()].map((value) => value.length) : [],
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
      },
      null,
      2,
    ),
  );
  if (!success) process.exitCode = 1;
} catch (error) {
  console.log(
    JSON.stringify(
      {
        provider: "DeepSeek",
        model,
        check: "page_translation_batch",
        success: false,
        durationMs: Math.round(performance.now() - started),
        result: error instanceof ProviderFailure ? error.publicError.code : "UNKNOWN",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
