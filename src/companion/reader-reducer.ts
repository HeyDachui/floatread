import type { PublicError } from "../shared/errors";
import type { ReaderMode } from "../shared/types";

interface ReaderRequestBase {
  requestId: string;
  mode: ReaderMode;
  originalText: string;
  output: string;
}

export type ReaderState =
  | { value: "idle" }
  | (ReaderRequestBase & { value: "requesting" })
  | (ReaderRequestBase & { value: "streaming"; providerLabel: string; cached: boolean })
  | (ReaderRequestBase & { value: "success"; providerLabel: string; cached: boolean })
  | (ReaderRequestBase & { value: "cancelled"; providerLabel?: string | undefined })
  | (ReaderRequestBase & {
      value: "error";
      error: PublicError;
      providerLabel?: string | undefined;
    });

export type ReaderEvent =
  | { type: "START"; requestId: string; mode: ReaderMode; originalText: string }
  | {
      type: "STREAM_START";
      requestId: string;
      providerLabel: string;
      cached: boolean;
    }
  | { type: "STREAM_DELTA"; requestId: string; text: string }
  | { type: "STREAM_DONE"; requestId: string }
  | { type: "STREAM_ERROR"; requestId: string; error: PublicError }
  | { type: "CANCEL"; requestId: string }
  | { type: "CLOSE" };

export const INITIAL_READER_STATE: ReaderState = { value: "idle" };

function isMatchingRequest(
  state: ReaderState,
  requestId: string,
): state is Exclude<ReaderState, { value: "idle" }> {
  return state.value !== "idle" && state.requestId === requestId;
}

function isActiveRequest(
  state: ReaderState,
  requestId: string,
): state is Extract<ReaderState, { value: "requesting" | "streaming" }> {
  return (
    (state.value === "requesting" || state.value === "streaming") && state.requestId === requestId
  );
}

export function readerReducer(state: ReaderState, event: ReaderEvent): ReaderState {
  switch (event.type) {
    case "START":
      return {
        value: "requesting",
        requestId: event.requestId,
        mode: event.mode,
        originalText: event.originalText,
        output: "",
      };
    case "STREAM_START":
      if (!isActiveRequest(state, event.requestId)) return state;
      return {
        ...state,
        value: "streaming",
        providerLabel: event.providerLabel,
        cached: event.cached,
      };
    case "STREAM_DELTA":
      if (!isActiveRequest(state, event.requestId)) return state;
      return {
        ...state,
        value: "streaming",
        output: state.output + event.text,
        providerLabel:
          "providerLabel" in state && typeof state.providerLabel === "string"
            ? state.providerLabel
            : "AI Provider",
        cached: "cached" in state ? state.cached : false,
      };
    case "STREAM_DONE":
      if (!isActiveRequest(state, event.requestId)) return state;
      return {
        ...state,
        value: "success",
        providerLabel:
          "providerLabel" in state && typeof state.providerLabel === "string"
            ? state.providerLabel
            : "AI Provider",
        cached: "cached" in state ? state.cached : false,
      };
    case "STREAM_ERROR":
      if (!isMatchingRequest(state, event.requestId)) return state;
      if (event.error.code === "ABORTED") {
        return {
          ...state,
          value: "cancelled",
          providerLabel: "providerLabel" in state ? state.providerLabel : undefined,
        };
      }
      return {
        ...state,
        value: "error",
        error: event.error,
        providerLabel: "providerLabel" in state ? state.providerLabel : undefined,
      };
    case "CANCEL":
      if (!isMatchingRequest(state, event.requestId)) return state;
      return {
        ...state,
        value: "cancelled",
        providerLabel: "providerLabel" in state ? state.providerLabel : undefined,
      };
    case "CLOSE":
      return INITIAL_READER_STATE;
  }
}
