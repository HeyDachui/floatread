export type PetFacing = "left" | "right";
export type PetInteraction = "idle" | "pressed" | "turning" | "walking";

export const PET_DRAG_THRESHOLD_PX = 4;

export function hasPetDragStarted(
  start: { x: number; y: number },
  current: { x: number; y: number },
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= PET_DRAG_THRESHOLD_PX;
}

export function petFacingFromHorizontalMotion(deltaX: number, fallback: PetFacing): PetFacing {
  if (deltaX > 0) return "right";
  if (deltaX < 0) return "left";
  return fallback;
}
