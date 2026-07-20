import { describe, expect, it } from "vitest";
import { contentToBackgroundSchema } from "../../src/shared/messages";

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
