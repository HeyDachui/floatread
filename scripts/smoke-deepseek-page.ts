import { streamPageTranslationWithSingleRetry } from "../src/page-translation/complete";
import { buildPageTranslationPrompt } from "../src/page-translation/prompt";
import { deepSeekAdapter } from "../src/providers/openai-compatible";
import { ProviderFailure, type ProviderProfile } from "../src/providers/types";
import type { PageTranslationQuality } from "../src/translation/languages";

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
  {
    id: "ted_title_0",
    kind: "content" as const,
    text: "A better way to learn difficult ideas",
    sourceLanguage: "en" as const,
  },
  {
    id: "ted_ui_0",
    kind: "ui" as const,
    text: "About the speaker",
    sourceLanguage: "en" as const,
  },
  {
    id: "reddit_content_0",
    kind: "content" as const,
    text: "This discussion explains why the result matters.",
    sourceLanguage: "en" as const,
  },
  {
    id: "ui_0",
    kind: "ui" as const,
    text: "Share this idea",
    sourceLanguage: "en" as const,
  },
];

interface SmokeRun {
  quality: PageTranslationQuality;
  success: boolean;
  durationMs: number;
  firstSegmentMs?: number;
  segmentCount: number;
  outputCharacters: number[];
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  mixedNameTranslated: boolean;
}

async function runQuality(quality: PageTranslationQuality): Promise<SmokeRun> {
  const prompt = buildPageTranslationPrompt(segments, "zh-Hans", quality);
  const started = performance.now();
  const controller = new AbortController();
  let firstSegmentMs: number | undefined;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  const parsed = await streamPageTranslationWithSingleRetry(
    () =>
      deepSeekAdapter.stream(
        {
          requestId: `page-smoke-${quality}`,
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
  return {
    quality,
    success,
    durationMs: Math.round(performance.now() - started),
    ...(firstSegmentMs === undefined ? {} : { firstSegmentMs }),
    segmentCount: parsed.size,
    outputCharacters: [...parsed.values()].map((value) => value.length),
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(inputTokens === undefined || outputTokens === undefined
      ? {}
      : { totalTokens: inputTokens + outputTokens }),
    mixedNameTranslated: mixedResult !== segments[0]?.text,
  };
}

const started = performance.now();
try {
  const fast = await runQuality("fast");
  const precise = await runQuality("precise");
  const success = fast.success && precise.success;
  console.log(
    JSON.stringify(
      {
        provider: "DeepSeek",
        model,
        check: "v4_fast_precise_stream_comparison",
        success,
        durationMs: Math.round(performance.now() - started),
        result: success ? "two_strict_json_batches_received" : "INVALID_RESPONSE",
        fast,
        precise,
        fastFirstSegmentAdvantageMs:
          fast.firstSegmentMs === undefined || precise.firstSegmentMs === undefined
            ? undefined
            : precise.firstSegmentMs - fast.firstSegmentMs,
        fastCompletionAdvantageMs: precise.durationMs - fast.durationMs,
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
        check: "v4_fast_precise_stream_comparison",
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
