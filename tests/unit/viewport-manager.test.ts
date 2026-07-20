import { describe, expect, it } from "vitest";
import { isDragGesture } from "../../src/companion/drag-controller";
import { clampPoint, pointToPosition, positionToPoint } from "../../src/content/viewport-manager";

describe("companion positioning", () => {
  const viewport = { width: 1_000, height: 800 };

  it("distinguishes click from drag at the four-pixel threshold", () => {
    expect(isDragGesture({ x: 10, y: 10 }, { x: 13, y: 12 })).toBe(false);
    expect(isDragGesture({ x: 10, y: 10 }, { x: 14, y: 10 })).toBe(true);
  });

  it("clamps the companion to the visible viewport", () => {
    expect(clampPoint({ x: -50, y: 900 }, viewport, 58, 12)).toEqual({ x: 12, y: 730 });
  });

  it("stores edge plus y-ratio and restores it after resize", () => {
    const stored = pointToPosition({ x: 900, y: 400 }, viewport, 58, 12);
    expect(stored.edge).toBe("right");
    expect(stored.yRatio).toBeGreaterThan(0.4);
    expect(stored.yRatio).toBeLessThan(0.6);
    expect(positionToPoint(stored, { width: 500, height: 400 }, 58, 12)).toEqual({
      x: 430,
      y: expect.any(Number),
    });
  });
});
