import { describe, expect, it } from "vitest";
import {
  contentToBackgroundSchema,
  generationPortIncomingSchema,
  generationPortOutgoingSchema,
  pageTranslationPortIncomingSchema,
} from "../../src/shared/messages";

describe("content message protocol", () => {
  it("accepts a normalized companion position", () => {
    expect(
      contentToBackgroundSchema.safeParse({
        type: "UPDATE_COMPANION_POSITION",
        position: { edge: "left", yRatio: 0.4 },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown fields and out-of-range positions", () => {
    expect(
      contentToBackgroundSchema.safeParse({
        type: "UPDATE_COMPANION_POSITION",
        position: { edge: "left", yRatio: 2 },
        apiKey: "must-not-cross-the-boundary",
      }).success,
    ).toBe(false);
  });
});

describe("page translation port protocol", () => {
  it("accepts bounded typed segments and rejects credentials or oversized batches", () => {
    expect(
      pageTranslationPortIncomingSchema.safeParse({
        type: "PAGE_TRANSLATE_BATCH",
        jobId: "page-job-123456",
        segments: [{ id: "seg_0", text: "Home", kind: "ui" }],
      }).success,
    ).toBe(true);
    expect(
      pageTranslationPortIncomingSchema.safeParse({
        type: "PAGE_TRANSLATE_BATCH",
        jobId: "page-job-123456",
        segments: [{ id: "seg_0", text: "Home", kind: "ui", apiKey: "forbidden" }],
      }).success,
    ).toBe(false);
    expect(
      pageTranslationPortIncomingSchema.safeParse({
        type: "PAGE_TRANSLATE_BATCH",
        jobId: "page-job-123456",
        segments: Array.from({ length: 12 }, (_, index) => ({
          id: `seg_${index}`,
          text: "x".repeat(600),
          kind: "content",
        })),
      }).success,
    ).toBe(false);
  });
});

describe("generation port protocol", () => {
  it("accepts only bounded selected text and known modes", () => {
    expect(
      generationPortIncomingSchema.safeParse({
        type: "GENERATE_START",
        requestId: "request-12345678",
        text: "Source",
        mode: "natural_zh",
      }).success,
    ).toBe(true);
    expect(
      generationPortIncomingSchema.safeParse({
        type: "GENERATE_START",
        requestId: "request-12345678",
        text: "x".repeat(12_001),
        mode: "natural_zh",
      }).success,
    ).toBe(false);
  });

  it("rejects credentials, headers, and unknown event fields", () => {
    expect(
      generationPortIncomingSchema.safeParse({
        type: "GENERATE_START",
        requestId: "request-12345678",
        text: "Source",
        mode: "natural_zh",
        apiKey: "must-never-cross-this-boundary",
        authorization: "Bearer secret",
      }).success,
    ).toBe(false);
    expect(
      generationPortOutgoingSchema.safeParse({
        type: "STREAM_DELTA",
        requestId: "request-12345678",
        text: "Result",
        html: "<script>bad()</script>",
      }).success,
    ).toBe(false);
  });
});
