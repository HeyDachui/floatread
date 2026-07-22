import { useEffect, useRef, useState } from "react";
import type { SkinState } from "../skins/types";
import petMochiStyles from "./pet-mochi.css?inline";
import {
  hasPetDragStarted,
  petFacingFromHorizontalMotion,
  type PetFacing,
  type PetInteraction,
} from "./pet-motion";

interface CompanionArtworkProps {
  state: SkinState;
  imageUrl?: string | undefined;
  skinId?: string | undefined;
}

const BUILTIN_PET_IDS = new Set(["mochi", "maple", "piko"]);

export function CompanionArtwork({
  state,
  imageUrl,
  skinId,
}: CompanionArtworkProps): React.JSX.Element {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const [facing, setFacing] = useState<PetFacing>("left");
  const [interaction, setInteraction] = useState<PetInteraction>("idle");
  const facingRef = useRef<PetFacing>("left");
  const isBuiltinPet = skinId !== undefined && BUILTIN_PET_IDS.has(skinId);
  const isMochi = skinId === "mochi";

  useEffect(() => {
    if (!isBuiltinPet) return;
    const button = rootRef.current?.closest<HTMLButtonElement>(".fr-companion");
    if (!button) return;

    let pointerId: number | null = null;
    let start = { x: 0, y: 0 };
    let lastX = 0;
    let dragged = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settleAfter = (next: PetInteraction, delay: number): void => {
      if (timer) clearTimeout(timer);
      setInteraction(next);
      timer = setTimeout(() => setInteraction("idle"), delay);
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (typeof event.button === "number" && event.button !== 0) return;
      pointerId = event.pointerId;
      start = { x: event.clientX, y: event.clientY };
      lastX = event.clientX;
      dragged = false;
      setInteraction("pressed");
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (pointerId !== event.pointerId) return;
      const point = { x: event.clientX, y: event.clientY };
      dragged ||= hasPetDragStarted(start, point);
      if (!dragged) return;
      const nextFacing = petFacingFromHorizontalMotion(event.clientX - lastX, facingRef.current);
      if (nextFacing !== facingRef.current) settleAfter("turning", 210);
      else setInteraction("walking");
      facingRef.current = nextFacing;
      setFacing(nextFacing);
      lastX = event.clientX;
    };
    const onPointerEnd = (event: PointerEvent): void => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      settleAfter(dragged ? "turning" : "pressed", dragged ? 280 : 230);
    };

    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerup", onPointerEnd);
    button.addEventListener("pointercancel", onPointerEnd);
    return () => {
      if (timer) clearTimeout(timer);
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointermove", onPointerMove);
      button.removeEventListener("pointerup", onPointerEnd);
      button.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [isBuiltinPet]);

  return (
    <span
      ref={rootRef}
      className={`fr-pet-probe${!imageUrl && !isBuiltinPet ? " fr-artwork" : ""}`}
      aria-hidden="true"
    >
      <style>{petMochiStyles}</style>
      {isMochi && imageUrl ? (
        <span
          className="fr-mochi-art fr-artwork"
          data-art-state={state}
          data-facing={facing}
          data-interaction={interaction}
          style={{ "--fr-mochi-facing": facing === "right" ? -1 : 1 } as React.CSSProperties}
        >
          <img className="fr-mochi-base" src={imageUrl} alt="" draggable={false} />
          <img className="fr-mochi-layer fr-mochi-paw" src={imageUrl} alt="" draggable={false} />
          <img className="fr-mochi-layer fr-mochi-tail" src={imageUrl} alt="" draggable={false} />
          <span className="fr-mochi-lid fr-mochi-lid-left" />
          <span className="fr-mochi-lid fr-mochi-lid-right" />
        </span>
      ) : isBuiltinPet && imageUrl ? (
        <span
          className="fr-authored-pet fr-artwork"
          data-art-state={state}
          data-facing={facing}
          data-interaction={interaction}
          style={{ "--fr-pet-facing": facing === "right" ? -1 : 1 } as React.CSSProperties}
        >
          <img src={imageUrl} alt="" draggable={false} />
          <span className="fr-pet-reaction" />
        </span>
      ) : imageUrl ? (
        <img className="fr-community-art" src={imageUrl} alt="" draggable={false} />
      ) : (
        <>
          <span className="fr-orb-core" />
          <span className="fr-orb-focus" />
          <span className="fr-art-detail" />
        </>
      )}
    </span>
  );
}
