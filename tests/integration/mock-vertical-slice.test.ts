import { expect, it } from "vitest";
import { readerReducer, type ReaderState } from "../../src/companion/reader-reducer";
import { buildPrompt } from "../../src/prompts/build-prompt";
import { streamMockResult } from "../../src/providers/mock";

it("carries selected text through prompt, streaming, and result state", async () => {
  const requestId = "integration-request";
  const source = "We reset usage limits for affected Codex users.";
  const prompt = buildPrompt("natural_zh", source);
  expect(prompt.userPrompt).toContain(JSON.stringify(source));

  let state: ReaderState = readerReducer(
    { value: "idle" },
    { type: "START", requestId, mode: "natural_zh", originalText: source },
  );
  state = readerReducer(state, {
    type: "STREAM_START",
    requestId,
    providerLabel: "Mock Provider",
    cached: false,
  });
  for await (const text of streamMockResult("natural_zh", source, new AbortController().signal)) {
    state = readerReducer(state, { type: "STREAM_DELTA", requestId, text });
  }
  state = readerReducer(state, { type: "STREAM_DONE", requestId });

  expect(state).toMatchObject({
    value: "success",
    originalText: source,
    output: "我们已重置受影响的 Codex 用户的使用限额。",
  });
});
