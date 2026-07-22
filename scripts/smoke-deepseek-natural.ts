import { buildPrompt } from "../src/prompts/build-prompt";
import { deepSeekAdapter } from "../src/providers/openai-compatible";
import { ProviderFailure, type ProviderProfile } from "../src/providers/types";

const key = process.env.FLOATREAD_TEST_DEEPSEEK_KEY?.trim();
const baseUrl = process.env.FLOATREAD_TEST_BASE_URL?.trim() || "https://api.deepseek.com";
const model = process.env.FLOATREAD_TEST_MODEL?.trim() || "deepseek-v4-flash";

if (!key) {
  throw new Error("FLOATREAD_TEST_DEEPSEEK_KEY is required; the value will not be logged.");
}

const profile: ProviderProfile = {
  id: "natural-smoke-deepseek",
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

const source = `@ChatGPTapp
writing feature

Chat can now ask a few targeted questions to understand the context before it writes

That means less back-and-forth, more personalized drafts, and better results from the start

Try it out and let us know what you think!`;
const prompt = buildPrompt("natural_zh", source);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), profile.timeoutMs);
const started = performance.now();

try {
  let output = "";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  for await (const event of deepSeekAdapter.stream(
    {
      requestId: "natural-tweet-smoke",
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      maxOutputTokens: prompt.maxOutputTokens,
      temperature: 0,
    },
    profile,
    key,
    controller.signal,
  )) {
    if (event.type === "delta") output += event.text;
    if (event.type === "usage") {
      inputTokens = event.inputTokens;
      outputTokens = event.outputTokens;
    }
  }
  const leavesTargetEnglishSentences = /less back-and-forth|try it out and let us know/iu.test(
    output,
  );
  const success =
    /\p{Script=Han}/u.test(output) &&
    output.includes("ChatGPTapp") &&
    !leavesTargetEnglishSentences &&
    output.trim() !== source;
  console.log(
    JSON.stringify(
      {
        provider: "DeepSeek",
        model,
        check: "natural_chinese_original_tweet",
        success,
        durationMs: Math.round(performance.now() - started),
        outputCharacters: output.length,
        containsChinese: /\p{Script=Han}/u.test(output),
        preservesHandle: output.includes("ChatGPTapp"),
        leavesTargetEnglishSentences,
        ...(inputTokens === undefined ? {} : { inputTokens }),
        ...(outputTokens === undefined ? {} : { outputTokens }),
        ...(inputTokens === undefined || outputTokens === undefined
          ? {}
          : { totalTokens: inputTokens + outputTokens }),
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
        check: "natural_chinese_original_tweet",
        success: false,
        durationMs: Math.round(performance.now() - started),
        result: error instanceof ProviderFailure ? error.publicError.code : "UNKNOWN",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
