import { buildPageTranslationPrompt } from "../src/page-translation/prompt";
import { streamPageTranslationWithSingleRetry } from "../src/page-translation/complete";
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
  {
    id: "mixed_name_0",
    kind: "content" as const,
    text: "ChatGPT Work => ChatGPT HelpMeWithEverything?",
    sourceLanguage: "en" as const,
  },
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
  const controller = new AbortController();
  let firstSegmentMs: number | undefined;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  const parsed = await streamPageTranslationWithSingleRetry(
    () =>
      deepSeekAdapter.stream(
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
        controller.signal,
      ),
    segments.map((segment) => segment.id),
    controller.signal,
    () => {
      firstSegmentMs ??= Math.round(performance.now() - started);
    },
    (input, output) => {
      inputTokens = input;
      outputTokens = output;
    },
  );
  const mixedResult = parsed.get("mixed_name_0") ?? "";
  const success =
    parsed.size === segments.length &&
    mixedResult.includes("ChatGPT") &&
    mixedResult !== segments[0]?.text;
  console.log(
    JSON.stringify(
      {
        provider: "DeepSeek",
        model,
        check: "v3_stream_page_batch",
        success,
        durationMs: Math.round(performance.now() - started),
        result: success ? "strict_json_batch_received" : "INVALID_RESPONSE",
        segmentCount: parsed.size,
        firstSegmentMs,
        outputCharacters: [...parsed.values()].map((value) => value.length),
        mixedNameTranslated: mixedResult !== segments[0]?.text,
        inputTokens,
        outputTokens,
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
        check: "v3_stream_page_batch",
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
