import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createGenerationClient, type GenerationClient } from "../content/generation-client";
import { createSelectionManager, type SelectionSnapshot } from "../content/selection-manager";
import {
  addPageTranslationSourceLanguage,
  clearPageTranslation,
  getOriginalTextForPrecisionReading,
  getPageTranslationState,
  pausePageTranslation,
  startPageTranslation,
  subscribePageTranslation,
  subscribePageTranslationNotices,
  type PageTranslationState,
} from "../content/page-translator";
import { rememberLastResult } from "../content/last-result";
import type { InitialCompanionAction } from "../content/mount";
import { createTranslator, type MessageKey } from "../i18n/catalog";
import {
  clampPoint,
  pointToPosition,
  positionToPoint,
  type ViewportPoint,
} from "../content/viewport-manager";
import type { CompanionPosition, PublicBootstrap, ReaderMode } from "../shared/types";
import type { BackgroundResponse } from "../shared/messages";
import { skinAssetResponseSchema } from "../skins/schema";
import type { SkinState } from "../skins/types";
import { TRANSLATION_LANGUAGE_KEYS, type TranslationLanguage } from "../translation/languages";
import { CompanionArtwork } from "./CompanionArtwork";
import { isDragGesture } from "./drag-controller";
import { ResultPanel } from "./ResultPanel";
import { INITIAL_READER_STATE, readerReducer } from "./reader-reducer";

interface FloatingCompanionProps {
  bootstrap: PublicBootstrap;
  host: HTMLElement;
  onHide: () => void;
  initialAction?: InitialCompanionAction | undefined;
}

interface DragSession {
  pointerId: number;
  pointerStart: ViewportPoint;
  elementStart: ViewportPoint;
  dragged: boolean;
}

export function FloatingCompanion({
  bootstrap,
  host,
  onHide,
  initialAction,
}: FloatingCompanionProps): React.JSX.Element {
  const [position, setPosition] = useState<CompanionPosition>(bootstrap.companionPosition);
  const [dragPoint, setDragPoint] = useState<ViewportPoint | null>(null);
  const [selection, setSelection] = useState<SelectionSnapshot | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [catchingUp, setCatchingUp] = useState(false);
  const [catchUpMessage, setCatchUpMessage] = useState(false);
  const [viewportVersion, setViewportVersion] = useState(0);
  const [readerState, dispatch] = useReducer(readerReducer, INITIAL_READER_STATE);
  const [visualFeedback, setVisualFeedback] = useState<"success" | "error" | null>(null);
  const [focusPanelOnOpen, setFocusPanelOnOpen] = useState(false);
  const [skinImageUrl, setSkinImageUrl] = useState<string | undefined>(undefined);
  const [pageTranslation, setPageTranslation] =
    useState<PageTranslationState>(getPageTranslationState());
  const [sessionSourceLanguages, setSessionSourceLanguages] = useState(
    bootstrap.translation.sourceLanguages,
  );
  const [ignoredDetectedLanguages, setIgnoredDetectedLanguages] = useState(
    bootstrap.ignoredDetectedLanguages,
  );
  const t = useMemo(() => createTranslator(bootstrap.locale), [bootstrap.locale]);
  const modeLabels: Array<{ mode: ReaderMode; label: string; description: string }> = [
    { mode: "natural_zh", label: t("modeNatural"), description: t("modeNaturalDesc") },
    { mode: "key_points", label: t("modePoints"), description: t("modePointsDesc") },
    { mode: "explain_terms", label: t("modeTerms"), description: t("modeTermsDesc") },
  ];
  const dragSession = useRef<DragSession | null>(null);
  const generationClient = useRef<GenerationClient | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const focusMenuOnOpen = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const catchUpTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const catchUpMessageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { companionSize, companionOpacity, snapMargin } = bootstrap.appearance;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const snappedPoint = useMemo(
    () => positionToPoint(position, viewport, companionSize, snapMargin),
    // viewportVersion intentionally invalidates the memo after a browser resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position, companionSize, snapMargin, viewportVersion],
  );
  const visualPoint = dragPoint ?? snappedPoint;
  const isGenerating = readerState.value === "requesting" || readerState.value === "streaming";
  const isPageTranslating =
    pageTranslation.status === "scanning" || pageTranslation.status === "translating";
  const isPageActive =
    isPageTranslating ||
    pageTranslation.status === "watching" ||
    pageTranslation.status === "background_paused";
  const suggestedLanguage =
    sessionSourceLanguages.length < 5
      ? pageTranslation.detectedLanguages?.find(
          (language) =>
            language !== bootstrap.translation.targetLanguage &&
            !sessionSourceLanguages.includes(language) &&
            !ignoredDetectedLanguages.includes(language),
        )
      : undefined;
  const visualState =
    isGenerating || isPageTranslating
      ? "thinking"
      : (visualFeedback ??
        (pageTranslation.status === "error" ? "error" : selection ? "ready" : "idle"));
  const skinState = visualState as SkinState;
  const pageStatusText =
    pageTranslation.status === "scanning" || pageTranslation.status === "translating"
      ? t("pageTranslationProgress", String(pageTranslation.translatedCount))
      : pageTranslation.status === "watching"
        ? pageTranslation.translatedCount === 0
          ? t("pageTranslationNoMatch")
          : t("pageTranslationWatching", String(pageTranslation.translatedCount))
        : pageTranslation.status === "background_paused"
          ? t("pageTranslationBackgroundPaused")
          : pageTranslation.status === "error"
            ? pageTranslation.message
            : null;

  useEffect(() => {
    if (bootstrap.skin.availableAssets.length === 0) {
      setSkinImageUrl(undefined);
      return;
    }
    let current = true;
    void chrome.runtime
      .sendMessage({ type: "GET_ACTIVE_SKIN_ASSET", state: skinState })
      .then((response: BackgroundResponse) => {
        const parsed = response.ok ? skinAssetResponseSchema.safeParse(response.data) : null;
        if (current) setSkinImageUrl(parsed?.success ? parsed.data.dataUrl : undefined);
      })
      .catch(() => {
        if (current) setSkinImageUrl(undefined);
      });
    return () => {
      current = false;
    };
  }, [bootstrap.skin.availableAssets.length, skinState]);

  useEffect(() => {
    generationClient.current = createGenerationClient((event) => dispatch(event));
    return () => {
      generationClient.current?.dispose();
      generationClient.current = null;
    };
  }, []);

  useEffect(() => {
    if (readerState.value !== "success" && readerState.value !== "error") return;
    setVisualFeedback(readerState.value);
    const timer = setTimeout(
      () => setVisualFeedback(null),
      readerState.value === "success" ? 900 : 1_200,
    );
    return () => clearTimeout(timer);
  }, [readerState.value]);

  useEffect(() => {
    const manager = createSelectionManager(setSelection);
    manager.captureNow();
    return () => manager.destroy();
  }, []);

  useEffect(() => subscribePageTranslation(setPageTranslation), []);

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
      if (catchUpTimer.current) clearTimeout(catchUpTimer.current);
      if (catchUpMessageTimer.current) clearTimeout(catchUpMessageTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!actionMenuOpen || !focusMenuOnOpen.current) return;
    focusMenuOnOpen.current = false;
    actionMenuRef.current?.querySelector<HTMLButtonElement>(".fr-mode-button")?.focus();
  }, [actionMenuOpen]);

  const showHint = (message: string): void => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(message);
    hintTimer.current = setTimeout(() => setHint(null), 2_500);
  };

  useEffect(
    () =>
      subscribePageTranslationNotices((notice) => {
        if (notice.type !== "scroll_catch_up") return;
        if (hintTimer.current) clearTimeout(hintTimer.current);
        if (catchUpTimer.current) clearTimeout(catchUpTimer.current);
        if (catchUpMessageTimer.current) clearTimeout(catchUpMessageTimer.current);
        setHint(null);
        setCatchUpMessage(true);
        setCatchingUp(true);
        catchUpMessageTimer.current = setTimeout(() => setCatchUpMessage(false), 2_000);
        catchUpTimer.current = setTimeout(() => setCatchingUp(false), 700);
      }),
    [t],
  );

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

  const activateCompanion = (precisionMenu = false, keyboard = false): void => {
    setContextMenuOpen(false);
    if (precisionMenu && selection) {
      if (bootstrap.clickBehavior === "run_default_mode") {
        startGeneration(bootstrap.defaultMode, selection.text, keyboard);
        return;
      }
      focusMenuOnOpen.current = keyboard;
      setActionMenuOpen((open) => !open);
      return;
    }
    setActionMenuOpen(false);
    if (isPageActive) {
      void chrome.runtime.sendMessage({
        type: "SET_PAGE_TRANSLATION_PREFERENCE",
        enabled: false,
      });
      pausePageTranslation();
      showHint(t("pageTranslationPaused", String(pageTranslation.translatedCount)));
    } else {
      void chrome.runtime.sendMessage({
        type: "SET_PAGE_TRANSLATION_PREFERENCE",
        enabled: true,
      });
      startPageTranslation(bootstrap.translation);
      showHint(t("pageTranslationStarting"));
    }
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
    activateCompanion();
  };

  const startGeneration = (mode: ReaderMode, text: string, focusOnOpen = false): void => {
    if (readerState.value !== "idle" && isGenerating) {
      generationClient.current?.cancel(readerState.requestId);
    }
    const sourceText = getOriginalTextForPrecisionReading(text);
    const requestId = crypto.randomUUID();
    dispatch({ type: "START", requestId, mode, originalText: sourceText });
    setFocusPanelOnOpen(focusOnOpen);
    setActionMenuOpen(false);
    setContextMenuOpen(false);
    generationClient.current?.start(requestId, sourceText, mode);
  };

  const selectMode = (mode: ReaderMode, focusOnOpen = false): void => {
    if (!selection) return;
    startGeneration(mode, selection.text, focusOnOpen);
  };

  useEffect(() => {
    if (!initialAction) return;
    if (initialAction.kind === "run") {
      startGeneration(initialAction.mode ?? bootstrap.defaultMode, initialAction.text, true);
    } else {
      showHint(
        initialAction.reason === "TOO_LONG"
          ? t("selectionTooLong", String(initialAction.length))
          : t("selectFirst"),
      );
    }
    // An initial action is immutable for this mounted instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (readerState.value === "success" && readerState.output) {
      rememberLastResult(readerState.output);
    }
  }, [readerState]);

  const cancelGeneration = (): void => {
    if (readerState.value === "idle") return;
    generationClient.current?.cancel(readerState.requestId);
    dispatch({ type: "CANCEL", requestId: readerState.requestId });
  };

  const closePanel = (): void => {
    cancelGeneration();
    dispatch({ type: "CLOSE" });
    setFocusPanelOnOpen(false);
    buttonRef.current?.focus();
  };

  const hideCompanion = (): void => {
    cancelGeneration();
    onHide();
  };

  const resetPosition = (): void => {
    const reset: CompanionPosition = { edge: "right", yRatio: 0.62 };
    setPosition(reset);
    setContextMenuOpen(false);
    void chrome.runtime.sendMessage({ type: "UPDATE_COMPANION_POSITION", position: reset });
  };

  const beginPageTranslation = (): void => {
    void chrome.runtime.sendMessage({ type: "SET_PAGE_TRANSLATION_PREFERENCE", enabled: true });
    startPageTranslation(bootstrap.translation);
    setActionMenuOpen(false);
    setContextMenuOpen(false);
    showHint(t("pageTranslationStarting"));
  };

  const stopPageTranslation = (): void => {
    void chrome.runtime.sendMessage({ type: "SET_PAGE_TRANSLATION_PREFERENCE", enabled: false });
    pausePageTranslation();
    setActionMenuOpen(false);
    setContextMenuOpen(false);
    showHint(t("pageTranslationPaused", String(pageTranslation.translatedCount)));
  };

  const removePageTranslations = (): void => {
    void chrome.runtime.sendMessage({ type: "SET_PAGE_TRANSLATION_PREFERENCE", enabled: false });
    clearPageTranslation();
    setContextMenuOpen(false);
  };

  const decideDetectedLanguage = (
    language: TranslationLanguage,
    decision: "once" | "always" | "ignore",
  ): void => {
    if (decision === "ignore") {
      setIgnoredDetectedLanguages((current) => [...new Set([...current, language])]);
      void chrome.runtime.sendMessage({
        type: "SET_SITE_LANGUAGE_DECISION",
        language,
        decision: "ignore",
      });
      return;
    }
    if (addPageTranslationSourceLanguage(language)) {
      setSessionSourceLanguages((current) => [...new Set([...current, language])]);
    }
    if (decision === "always") {
      void chrome.runtime.sendMessage({
        type: "SET_SITE_LANGUAGE_DECISION",
        language,
        decision: "always",
      });
    }
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
          "--fr-panel-width": `${bootstrap.appearance.panelWidth}px`,
          "--fr-panel-font-size": `${14 * bootstrap.appearance.fontScale}px`,
          "--fr-panel-radius": `${bootstrap.appearance.cornerRadius}px`,
          "--fr-panel-opacity": bootstrap.appearance.panelOpacity,
          "--fr-accent": bootstrap.skin.panel.accent,
          "--fr-bg": bootstrap.skin.panel.background,
          "--fr-bg-elevated": bootstrap.skin.panel.backgroundElevated,
          "--fr-text": bootstrap.skin.panel.text,
          "--fr-text-muted": bootstrap.skin.panel.textMuted,
          "--fr-border": bootstrap.skin.panel.border,
          "--fr-success": bootstrap.skin.panel.success,
          "--fr-warning": bootstrap.skin.panel.warning,
          "--fr-error": bootstrap.skin.panel.error,
          "--fr-skin-radius": `${bootstrap.skin.panel.radius}px`,
          "--fr-shadow-alpha": bootstrap.skin.panel.shadowStrength,
        } as React.CSSProperties
      }
      data-skin={bootstrap.skin.variant}
    >
      {catchUpMessage && pageTranslation.status !== "error" ? (
        <div className="fr-toast fr-catch-up-toast" role="status" aria-live="polite">
          {t("scrollTooFast")}
        </div>
      ) : pageStatusText ? (
        <div
          className={`fr-toast fr-page-status${pageTranslation.status === "error" ? " fr-page-status-error" : ""}`}
          role="status"
          aria-live={pageTranslation.status === "error" ? "assertive" : "polite"}
        >
          <span>{pageStatusText}</span>
          {suggestedLanguage ? (
            <div className="fr-language-suggestion">
              <strong>
                {t(
                  "detectedLanguageQuestion",
                  t(TRANSLATION_LANGUAGE_KEYS[suggestedLanguage] as MessageKey),
                )}
              </strong>
              <div>
                <button
                  type="button"
                  onClick={() => decideDetectedLanguage(suggestedLanguage, "once")}
                >
                  {t("translateOnce")}
                </button>
                <button
                  type="button"
                  onClick={() => decideDetectedLanguage(suggestedLanguage, "always")}
                >
                  {t("translateAlwaysHere")}
                </button>
                <button
                  type="button"
                  onClick={() => decideDetectedLanguage(suggestedLanguage, "ignore")}
                >
                  {t("ignoreLanguage")}
                </button>
              </div>
            </div>
          ) : null}
          {pageTranslation.status === "error" ? (
            <button
              type="button"
              onClick={() => void chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" })}
            >
              {t("openSettings")}
            </button>
          ) : null}
        </div>
      ) : hint ? (
        <div className="fr-toast" role="status" aria-live="polite">
          {hint}
        </div>
      ) : null}

      {actionMenuOpen ? (
        <div
          ref={actionMenuRef}
          className="fr-action-menu"
          role="menu"
          aria-label={t("actionsLabel")}
        >
          <div className="fr-menu-kicker">{t("actionsQuestion")}</div>
          {(pageTranslation.detectedLanguages?.length ?? 0) > 0 ? (
            <div className="fr-detected-languages">
              {t(
                "detectedLanguages",
                pageTranslation.detectedLanguages
                  ?.map((language) => t(TRANSLATION_LANGUAGE_KEYS[language] as MessageKey))
                  .join("、") ?? "",
              )}
            </div>
          ) : null}
          <button
            className="fr-mode-button fr-page-translate-button"
            type="button"
            role="menuitem"
            onClick={isPageActive ? stopPageTranslation : beginPageTranslation}
          >
            <span>{t(isPageActive ? "pausePageTranslation" : "translatePage")}</span>
            <small>{t("translatePageDesc")}</small>
          </button>
          {modeLabels.map((item) => (
            <button
              key={item.mode}
              className="fr-mode-button"
              type="button"
              role="menuitem"
              onClick={(event) => selectMode(item.mode, event.detail === 0)}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      ) : null}

      {contextMenuOpen ? (
        <div className="fr-context-menu" role="menu" aria-label={t("companionMenu")}>
          {selection
            ? modeLabels.map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  role="menuitem"
                  onClick={(event) => selectMode(item.mode, event.detail === 0)}
                >
                  {item.label}
                </button>
              ))
            : null}
          <button
            type="button"
            role="menuitem"
            onClick={isPageActive ? stopPageTranslation : beginPageTranslation}
          >
            {t(isPageActive ? "pausePageTranslation" : "resumePageTranslation")}
          </button>
          {pageTranslation.translatedCount > 0 ? (
            <button type="button" role="menuitem" onClick={removePageTranslations}>
              {t("clearPageTranslation")}
            </button>
          ) : null}
          <button type="button" role="menuitem" onClick={hideCompanion}>
            {t("hidePage")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" })}
          >
            {t("openSettings")}
          </button>
          <button type="button" role="menuitem" onClick={resetPosition}>
            {t("resetPosition")}
          </button>
        </div>
      ) : null}

      {readerState.value !== "idle" ? (
        <ResultPanel
          state={readerState}
          focusOnOpen={focusPanelOnOpen}
          onClose={closePanel}
          onCancel={cancelGeneration}
          onRetry={() => startGeneration(readerState.mode, readerState.originalText, true)}
          onSwitchMode={(mode) => startGeneration(mode, readerState.originalText, true)}
          locale={bootstrap.locale}
        />
      ) : null}

      <button
        ref={buttonRef}
        className={`fr-companion fr-state-${visualState}${catchingUp ? " fr-catching-up" : ""}`}
        data-motion={
          bootstrap.appearance.motionEnabled ? bootstrap.skin.motions[skinState] : "none"
        }
        type="button"
        aria-label={t(isPageActive ? "pausePageTranslation" : "translatePage")}
        aria-haspopup="menu"
        aria-expanded={actionMenuOpen || contextMenuOpen || readerState.value !== "idle"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragSession.current = null;
          setDragPoint(null);
        }}
        onDoubleClick={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && selection) {
            event.preventDefault();
            activateCompanion(true, true);
            return;
          }
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          activateCompanion(false, true);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setActionMenuOpen(false);
          setContextMenuOpen((open) => !open);
        }}
      >
        <CompanionArtwork state={skinState} imageUrl={skinImageUrl} />
        <span className="fr-visually-hidden" aria-live="polite">
          {selection
            ? t("selectionReady")
            : isPageActive
              ? t("pageTranslationWatching", String(pageTranslation.translatedCount))
              : t("translatePage")}
        </span>
      </button>
    </div>
  );
}
