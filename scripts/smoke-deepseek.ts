import { buildPrompt } from "../src/prompts/build-prompt";
import { deepSeekAdapter } from "../src/providers/openai-compatible";
import {
  ProviderFailure,
  type ProviderProfile,
  type ProviderRequest,
} from "../src/providers/types";

const key = process.env.FLOATREAD_TEST_DEEPSEEK_KEY?.trim();
const baseUrl = process.env.FLOATREAD_TEST_BASE_URL?.trim() || "https://api.deepseek.com";
const model = process.env.FLOATREAD_TEST_MODEL?.trim() || "deepseek-v4-flash";
const fixedText = "We reset usage limits for affected Codex users.";

if (!key) {
  throw new Error("FLOATREAD_TEST_DEEPSEEK_KEY is required; the value will not be logged.");
}

const profile: ProviderProfile = {
  id: "real-smoke-deepseek",
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

const prompt = buildPrompt("natural_zh", fixedText);
const request: ProviderRequest = {
  requestId: "real-smoke-generation",
  systemPrompt: prompt.systemPrompt,
  userPrompt: prompt.userPrompt,
  maxOutputTokens: 64,
  temperature: 0,
};

interface SmokeRecord {
  check: "connection" | "ordinary" | "stream" | "cancel";
  success: boolean;
  durationMs: number;
  result: string;
  outputChars?: number;
  inputTokens?: number;
  outputTokens?: number;
}

function errorCode(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "ABORTED";
  if (error instanceof ProviderFailure) return error.publicError.code;
  return "UNKNOWN";
}

async function timed<T>(run: () => Promise<T>): Promise<{ value: T; durationMs: number }> {
  const started = performance.now();
  const value = await run();
  return { value, durationMs: Math.round(performance.now() - started) };
}

const records: SmokeRecord[] = [];

const connectionController = new AbortController();
const connection = await timed(() =>
  deepSeekAdapter.testConnection(profile, key, connectionController.signal),
);
records.push({
  check: "connection",
  success: connection.value.ok,
  durationMs: connection.durationMs,
  result: connection.value.ok ? "text_received" : (connection.value.error?.code ?? "UNKNOWN"),
});
if (!connection.value.ok) {
  console.log(JSON.stringify({ provider: "DeepSeek", model, records }, null, 2));
  process.exitCode = 1;
} else {
  try {
    const ordinaryController = new AbortController();
    const ordinary = await timed(() =>
      deepSeekAdapter.complete(request, profile, key, ordinaryController.signal),
    );
    records.push({
      check: "ordinary",
      success: ordinary.value.text.trim().length > 0,
      durationMs: ordinary.durationMs,
      result: "text_received",
      outputChars: ordinary.value.text.length,
      ...(ordinary.value.inputTokens === undefined
        ? {}
        : { inputTokens: ordinary.value.inputTokens }),
      ...(ordinary.value.outputTokens === undefined
        ? {}
        : { outputTokens: ordinary.value.outputTokens }),
    });
  } catch (error) {
    records.push({
      check: "ordinary",
      success: false,
      durationMs: 0,
      result: errorCode(error),
    });
  }

  try {
    const streamController = new AbortController();
    const started = performance.now();
    let outputChars = 0;
    let sawDone = false;
    for await (const event of deepSeekAdapter.stream(
      { ...request, requestId: "real-smoke-stream" },
      profile,
      key,
      streamController.signal,
    )) {
      if (event.type === "delta") outputChars += event.text.length;
      if (event.type === "done") sawDone = true;
    }
    records.push({
      check: "stream",
      success: sawDone && outputChars > 0,
      durationMs: Math.round(performance.now() - started),
      result: sawDone && outputChars > 0 ? "stream_completed" : "INVALID_RESPONSE",
      outputChars,
    });
  } catch (error) {
    records.push({
      check: "stream",
      success: false,
      durationMs: 0,
      result: errorCode(error),
    });
  }

  const cancelController = new AbortController();
  const cancelStarted = performance.now();
  const timer = setTimeout(() => cancelController.abort(), 100);
  try {
    const cancellableStream = deepSeekAdapter.stream(
      { ...request, requestId: "real-smoke-cancel" },
      profile,
      key,
      cancelController.signal,
    );
    while (!(await cancellableStream.next()).done) {
      // Continue until the scheduled abort proves the live stream is cancellable.
    }
    records.push({
      check: "cancel",
      success: false,
      durationMs: Math.round(performance.now() - cancelStarted),
      result: "completed_before_abort",
    });
  } catch (error) {
    const result = errorCode(error);
    records.push({
      check: "cancel",
      success: result === "ABORTED",
      durationMs: Math.round(performance.now() - cancelStarted),
      result,
    });
  } finally {
    clearTimeout(timer);
  }

  console.log(JSON.stringify({ provider: "DeepSeek", model, records }, null, 2));
  if (records.some((record) => !record.success)) process.exitCode = 1;
}
