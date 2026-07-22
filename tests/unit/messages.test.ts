import { describe, expect, it } from "vitest";
import {
  contentToBackgroundSchema,
  generationPortIncomingSchema,
  generationPortOutgoingSchema,
  pageTranslationPortIncomingSchema,
  pageTranslationPortOutgoingSchema,
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

  it("accepts only a bounded site-language decision and never a page text payload", () => {
    expect(
      contentToBackgroundSchema.safeParse({
        type: "SET_SITE_LANGUAGE_DECISION",
        language: "ja",
        decision: "always",
      }).success,
    ).toBe(true);
    expect(
      contentToBackgroundSchema.safeParse({
        type: "SET_SITE_LANGUAGE_DECISION",
        language: "ja",
        decision: "always",
        text: "must-not-cross-this-message",
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
        sessionId: "b8cb7e62-092f-4b61-a729-fd85c675eb20",
        segments: [{ id: "seg_0", text: "Home", kind: "ui", sourceLanguage: "en" }],
      }).success,
    ).toBe(true);
    expect(
      pageTranslationPortIncomingSchema.safeParse({
        type: "PAGE_TRANSLATE_BATCH",
        jobId: "page-job-123456",
        sessionId: "b8cb7e62-092f-4b61-a729-fd85c675eb20",
        segments: [
          { id: "seg_0", text: "Home", kind: "ui", sourceLanguage: "en", apiKey: "forbidden" },
        ],
      }).success,
    ).toBe(false);
    expect(
      pageTranslationPortIncomingSchema.safeParse({
        type: "PAGE_TRANSLATE_BATCH",
        jobId: "page-job-123456",
        sessionId: "b8cb7e62-092f-4b61-a729-fd85c675eb20",
        segments: [
          { id: "seg_0", text: "x".repeat(12_001), kind: "content", sourceLanguage: "en" },
        ],
      }).success,
    ).toBe(false);
    expect(
      pageTranslationPortIncomingSchema.safeParse({
        type: "PAGE_TRANSLATE_BATCH",
        jobId: "page-job-123456",
        sessionId: "b8cb7e62-092f-4b61-a729-fd85c675eb20",
        segments: Array.from({ length: 12 }, (_, index) => ({
          id: `seg_${index}`,
          text: "x".repeat(1_100),
          kind: "content",
          sourceLanguage: "en",
        })),
      }).success,
    ).toBe(false);
  });

  it("accepts a bounded background heartbeat without carrying page text", () => {
    expect(
      pageTranslationPortOutgoingSchema.safeParse({
        type: "PAGE_BATCH_PROGRESS",
        jobId: "page-job-123456",
      }).success,
    ).toBe(true);
    expect(
      pageTranslationPortOutgoingSchema.safeParse({
        type: "PAGE_BATCH_PROGRESS",
        jobId: "page-job-123456",
        text: "must-not-be-sent",
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
