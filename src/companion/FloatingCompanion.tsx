import { useEffect, useMemo, useRef, useState } from "react";
import { createSelectionManager, type SelectionSnapshot } from "../content/selection-manager";
import {
  clampPoint,
  pointToPosition,
  positionToPoint,
  type ViewportPoint,
} from "../content/viewport-manager";
import type { CompanionPosition, PublicBootstrap, ReaderMode } from "../shared/types";
import { isDragGesture } from "./drag-controller";

interface FloatingCompanionProps {
  bootstrap: PublicBootstrap;
  host: HTMLElement;
  onHide: () => void;
  onModeSelected: (mode: ReaderMode, text: string) => void;
}

interface DragSession {
  pointerId: number;
  pointerStart: ViewportPoint;
  elementStart: ViewportPoint;
  dragged: boolean;
}

const MODE_LABELS: Array<{ mode: ReaderMode; label: string; description: string }> = [
  { mode: "natural_zh", label: "自然中文", description: "准确、自然地表达原意" },
  { mode: "key_points", label: "看懂重点", description: "意思、重点与未说明项" },
  { mode: "explain_terms", label: "解释术语", description: "用普通中文拆解关键概念" },
];

export function FloatingCompanion({
  bootstrap,
  host,
  onHide,
  onModeSelected,
}: FloatingCompanionProps): React.JSX.Element {
  const [position, setPosition] = useState<CompanionPosition>(bootstrap.companionPosition);
  const [dragPoint, setDragPoint] = useState<ViewportPoint | null>(null);
  const [selection, setSelection] = useState<SelectionSnapshot | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [viewportVersion, setViewportVersion] = useState(0);
  const dragSession = useRef<DragSession | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { companionSize, companionOpacity, snapMargin } = bootstrap.appearance;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const snappedPoint = useMemo(
    () => positionToPoint(position, viewport, companionSize, snapMargin),
    // viewportVersion intentionally invalidates the memo after a browser resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position, companionSize, snapMargin, viewportVersion],
  );
  const visualPoint = dragPoint ?? snappedPoint;
  const visualState = selection ? "ready" : "idle";

  useEffect(() => {
    const manager = createSelectionManager(setSelection);
    manager.captureNow();
    return () => manager.destroy();
  }, []);

  useEffect(() => {
    const onResize = (): void => setViewportVersion((version) => version + 1);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onOutsidePointerDown = (event: PointerEvent): void => {
      if (!event.composedPath().includes(host)) {
        setActionMenuOpen(false);
        setContextMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", onOutsidePointerDown, true);
  }, [host]);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const showHint = (message: string): void => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(message);
    hintTimer.current = setTimeout(() => setHint(null), 2_500);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    dragSession.current = {
      pointerId: event.pointerId,
      pointerStart: { x: event.clientX, y: event.clientY },
      elementStart: visualPoint,
      dragged: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const session = dragSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const pointer = { x: event.clientX, y: event.clientY };
    session.dragged ||= isDragGesture(session.pointerStart, pointer);
    if (!session.dragged) return;
    const nextPoint = clampPoint(
      {
        x: session.elementStart.x + pointer.x - session.pointerStart.x,
        y: session.elementStart.y + pointer.y - session.pointerStart.y,
      },
      viewport,
      companionSize,
      snapMargin,
    );
    setDragPoint(nextPoint);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const session = dragSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragSession.current = null;
    if (session.dragged && dragPoint) {
      const nextPosition = pointToPosition(dragPoint, viewport, companionSize, snapMargin);
      setPosition(nextPosition);
      setDragPoint(null);
      void chrome.runtime.sendMessage({
        type: "UPDATE_COMPANION_POSITION",
        position: nextPosition,
      });
      return;
    }
    if (!selection) {
      showHint("先选中一段需要理解的文字。");
      return;
    }
    setContextMenuOpen(false);
    setActionMenuOpen((open) => !open);
  };

  const selectMode = (mode: ReaderMode): void => {
    if (!selection) return;
    setActionMenuOpen(false);
    onModeSelected(mode, selection.text);
  };

  const resetPosition = (): void => {
    const reset: CompanionPosition = { edge: "right", yRatio: 0.62 };
    setPosition(reset);
    setContextMenuOpen(false);
    void chrome.runtime.sendMessage({ type: "UPDATE_COMPANION_POSITION", position: reset });
  };

  const sideClass = position.edge === "left" ? "fr-side-left" : "fr-side-right";

  return (
    <div
      className={`fr-companion-layer ${sideClass}`}
      style={
        {
          "--fr-companion-x": `${visualPoint.x}px`,
          "--fr-companion-y": `${visualPoint.y}px`,
          "--fr-companion-size": `${companionSize}px`,
          "--fr-companion-opacity": companionOpacity,
        } as React.CSSProperties
      }
    >
      {hint ? (
        <div className="fr-toast" role="status" aria-live="polite">
          {hint}
        </div>
      ) : null}

      {actionMenuOpen ? (
        <div className="fr-action-menu" role="menu" aria-label="选择阅读模式">
          <div className="fr-menu-kicker">如何阅读？</div>
          {MODE_LABELS.map((item) => (
            <button
              key={item.mode}
              className="fr-mode-button"
              type="button"
              role="menuitem"
              onClick={() => selectMode(item.mode)}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      ) : null}

      {contextMenuOpen ? (
        <div className="fr-context-menu" role="menu" aria-label="FloatRead 助手菜单">
          <button type="button" role="menuitem" onClick={onHide}>
            当前页面隐藏
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" })}
          >
            打开设置
          </button>
          <button type="button" role="menuitem" onClick={resetPosition}>
            恢复默认位置
          </button>
        </div>
      ) : null}

      <button
        ref={buttonRef}
        className={`fr-companion fr-state-${visualState}`}
        type="button"
        aria-label={selection ? "FloatRead：选择阅读模式" : "FloatRead：请先选择文字"}
        aria-expanded={actionMenuOpen || contextMenuOpen}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragSession.current = null;
          setDragPoint(null);
        }}
        onDoubleClick={(event) => event.preventDefault()}
        onContextMenu={(event) => {
          event.preventDefault();
          setActionMenuOpen(false);
          setContextMenuOpen((open) => !open);
        }}
      >
        <span className="fr-orb-core" aria-hidden="true" />
        <span className="fr-orb-focus" aria-hidden="true" />
        <span className="fr-visually-hidden" aria-live="polite">
          {selection ? "已选择文字，可以开始阅读" : "等待选择文字"}
        </span>
      </button>
    </div>
  );
}
