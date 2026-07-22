import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanionArtwork } from "../../src/companion/CompanionArtwork";
import { hasPetDragStarted, petFacingFromHorizontalMotion } from "../../src/companion/pet-motion";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderArtwork(variant: "pet" | "community", state = "idle", skinId = "mochi") {
  return render(
    <div className="fr-companion-layer" data-skin={variant}>
      <button className="fr-companion" type="button">
        <CompanionArtwork
          state={state as "idle"}
          imageUrl="data:image/webp;base64,AAAA"
          skinId={variant === "pet" ? skinId : undefined}
        />
      </button>
    </div>,
  );
}

function dispatchPointer(
  target: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  init: { pointerId: number; clientX: number; clientY: number; button?: number },
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: init.button ?? 0,
    clientX: init.clientX,
    clientY: init.clientY,
  });
  Object.defineProperty(event, "pointerId", { value: init.pointerId });
  fireEvent(target, event);
}

describe("built-in pet motion", () => {
  it("uses a four-pixel drag threshold and resolves horizontal facing", () => {
    expect(hasPetDragStarted({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(false);
    expect(hasPetDragStarted({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(true);
    expect(petFacingFromHorizontalMotion(5, "left")).toBe("right");
    expect(petFacingFromHorizontalMotion(-2, "right")).toBe("left");
  });

  it("renders Mochi as layered artwork with blink and state hooks", () => {
    const { container } = renderArtwork("pet", "thinking");
    const artwork = container.querySelector(".fr-mochi-art");

    expect(artwork).toHaveAttribute("data-art-state", "thinking");
    expect(container.querySelectorAll(".fr-mochi-lid")).toHaveLength(2);
    expect(container.querySelector(".fr-mochi-paw")).toBeInTheDocument();
    expect(container.querySelector("style")).toBeInTheDocument();
  });

  it("shows walking, turning, direction and restrained click feedback", async () => {
    vi.useFakeTimers();
    const { container } = renderArtwork("pet");
    const button = container.querySelector("button")!;
    const artwork = container.querySelector(".fr-mochi-art")!;

    dispatchPointer(button, "pointerdown", { pointerId: 1, clientX: 10, clientY: 10 });
    expect(artwork).toHaveAttribute("data-interaction", "pressed");
    dispatchPointer(button, "pointermove", { pointerId: 1, clientX: 25, clientY: 10 });
    expect(artwork).toHaveAttribute("data-facing", "right");
    expect(artwork).toHaveAttribute("data-interaction", "turning");
    dispatchPointer(button, "pointermove", { pointerId: 1, clientX: 35, clientY: 10 });
    expect(artwork).toHaveAttribute("data-interaction", "walking");
    dispatchPointer(button, "pointerup", { pointerId: 1, clientX: 35, clientY: 10 });
    expect(artwork).toHaveAttribute("data-interaction", "turning");

    await act(async () => vi.advanceTimersByTime(300));
    expect(artwork).toHaveAttribute("data-interaction", "idle");
  });

  it("keeps community single-image artwork on the existing image path", () => {
    const { container } = renderArtwork("community", "success");

    expect(container.querySelector(".fr-community-art")).toHaveAttribute(
      "src",
      "data:image/webp;base64,AAAA",
    );
    expect(container.querySelector(".fr-mochi-art")).not.toBeInTheDocument();
  });

  it("renders authored pets with state, walking direction and click reaction hooks", () => {
    const { container } = renderArtwork("pet", "thinking", "maple");
    const button = container.querySelector("button")!;
    const artwork = container.querySelector(".fr-authored-pet")!;

    expect(artwork).toHaveAttribute("data-art-state", "thinking");
    expect(container.querySelector(".fr-pet-reaction")).toBeInTheDocument();
    dispatchPointer(button, "pointerdown", { pointerId: 2, clientX: 20, clientY: 20 });
    dispatchPointer(button, "pointermove", { pointerId: 2, clientX: 8, clientY: 20 });
    expect(artwork).toHaveAttribute("data-facing", "left");
    expect(artwork).toHaveAttribute("data-interaction", "walking");
  });
});
