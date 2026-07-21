import { describe, expect, it } from "vitest";
import { publicError } from "../../src/shared/errors";
import {
  INITIAL_READER_STATE,
  readerReducer,
  type ReaderState,
} from "../../src/companion/reader-reducer";

const REQUEST_ID = "request-12345678";

function started(): ReaderState {
  return readerReducer(INITIAL_READER_STATE, {
    type: "START",
    requestId: REQUEST_ID,
    mode: "natural_zh",
    originalText: "Source",
  });
}

describe("reader state machine", () => {
  it("streams deltas and completes the matching request", () => {
    let state = started();
    state = readerReducer(state, {
      type: "STREAM_START",
      requestId: REQUEST_ID,
      providerLabel: "Mock Provider",
      cached: false,
    });
    state = readerReducer(state, {
      type: "STREAM_DELTA",
      requestId: REQUEST_ID,
      text: "第一段",
    });
    state = readerReducer(state, {
      type: "STREAM_DELTA",
      requestId: REQUEST_ID,
      text: "第二段",
    });
    state = readerReducer(state, { type: "STREAM_DONE", requestId: REQUEST_ID });

    expect(state).toMatchObject({
      value: "success",
      output: "第一段第二段",
      providerLabel: "Mock Provider",
      cached: false,
    });
  });

  it("ignores events from an obsolete request", () => {
    const state = started();
    expect(
      readerReducer(state, {
        type: "STREAM_DELTA",
        requestId: "obsolete-request",
        text: "must be ignored",
      }),
    ).toBe(state);
  });

  it("preserves partial output when cancelled", () => {
    let state = started();
    state = readerReducer(state, {
      type: "STREAM_DELTA",
      requestId: REQUEST_ID,
      text: "partial",
    });
    state = readerReducer(state, { type: "CANCEL", requestId: REQUEST_ID });
    expect(state).toMatchObject({ value: "cancelled", output: "partial" });
  });

  it("never revives a cancelled request when buffered stream events arrive late", () => {
    let state = readerReducer(INITIAL_READER_STATE, {
      type: "START",
      requestId: REQUEST_ID,
      mode: "natural_zh",
      originalText: "source",
    });
    state = readerReducer(state, { type: "CANCEL", requestId: REQUEST_ID });
    state = readerReducer(state, { type: "STREAM_DELTA", requestId: REQUEST_ID, text: "late" });
    state = readerReducer(state, { type: "STREAM_DONE", requestId: REQUEST_ID });
    expect(state).toMatchObject({ value: "cancelled", output: "" });
  });

  it("exposes a structured public error", () => {
    const error = publicError("RATE_LIMITED", "请求过多。", true);
    const state = readerReducer(started(), {
      type: "STREAM_ERROR",
      requestId: REQUEST_ID,
      error,
    });
    expect(state).toMatchObject({ value: "error", error });
  });
});
