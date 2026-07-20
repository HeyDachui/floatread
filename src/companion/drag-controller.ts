import type { ViewportPoint } from "../content/viewport-manager";

export const DRAG_THRESHOLD_PX = 4;

export function dragDistance(start: ViewportPoint, current: ViewportPoint): number {
  return Math.hypot(current.x - start.x, current.y - start.y);
}

export function isDragGesture(start: ViewportPoint, current: ViewportPoint): boolean {
  return dragDistance(start, current) >= DRAG_THRESHOLD_PX;
}
