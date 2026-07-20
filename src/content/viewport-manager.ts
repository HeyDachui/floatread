import type { CompanionPosition } from "../shared/types";

export interface ViewportPoint {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function clampPoint(
  point: ViewportPoint,
  viewport: ViewportSize,
  companionSize: number,
  margin: number,
): ViewportPoint {
  return {
    x: clamp(point.x, margin, viewport.width - companionSize - margin),
    y: clamp(point.y, margin, viewport.height - companionSize - margin),
  };
}

export function positionToPoint(
  position: CompanionPosition,
  viewport: ViewportSize,
  companionSize: number,
  margin: number,
): ViewportPoint {
  const availableHeight = Math.max(0, viewport.height - companionSize - margin * 2);
  const x =
    position.edge === "left" ? margin : Math.max(margin, viewport.width - companionSize - margin);
  return clampPoint(
    { x, y: margin + availableHeight * clamp(position.yRatio, 0, 1) },
    viewport,
    companionSize,
    margin,
  );
}

export function pointToPosition(
  point: ViewportPoint,
  viewport: ViewportSize,
  companionSize: number,
  margin: number,
): CompanionPosition {
  const clamped = clampPoint(point, viewport, companionSize, margin);
  const availableHeight = Math.max(1, viewport.height - companionSize - margin * 2);
  const midpoint = (viewport.width - companionSize) / 2;
  return {
    edge: clamped.x + companionSize / 2 <= midpoint ? "left" : "right",
    yRatio: clamp((clamped.y - margin) / availableHeight, 0, 1),
  };
}
