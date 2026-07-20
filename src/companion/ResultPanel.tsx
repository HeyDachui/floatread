import { useEffect, useMemo, useRef, useState } from "react";
import { createTranslator } from "../i18n/catalog";
import type { ReaderMode, UiLocale } from "../shared/types";
import type { ReaderState } from "./reader-reducer";

interface ResultPanelProps {
  state: Exclude<ReaderState, { value: "idle" }>;
  focusOnOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onSwitchMode: (mode: ReaderMode) => void;
  locale: UiLocale;
}

export function ResultPanel({
  state,
  focusOnOpen,
  onClose,
  onCancel,
  onRetry,
  onSwitchMode,
  locale,
}: ResultPanelProps): React.JSX.Element {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const isLoading = state.value === "requesting" || state.value === "streaming";
  const hasOutput = state.output.length > 0;
  const t = useMemo(() => createTranslator(locale), [locale]);
  const modeLabels: Record<ReaderMode, string> = {
    natural_zh: t("modeNatural"),
    key_points: t("modePoints"),
    explain_terms: t("modeTerms"),
  };

  useEffect(() => {
    if (focusOnOpen) closeButtonRef.current?.focus();
  }, [focusOnOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const copyResult = async (): Promise<void> => {
    if (!hasOutput) return;
    try {
      await navigator.clipboard.writeText(state.output);
      setCopyStatus(t("copied"));
    } catch {
      setCopyStatus(t("copyFailed"));
    }
  };

  return (
    <section className="fr-result-panel" aria-label={t("resultLabel")}>
      <header className="fr-panel-header">
        <div>
          <div className="fr-panel-kicker">FLOATREAD</div>
          <h2>{modeLabels[state.mode]}</h2>
        </div>
        <button
          ref={closeButtonRef}
          className="fr-icon-button"
          type="button"
          aria-label={t("closeResult")}
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <nav className="fr-mode-tabs" aria-label={t("switchMode")}>
        {(Object.keys(modeLabels) as ReaderMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-current={state.mode === mode ? "page" : undefined}
            onClick={() => onSwitchMode(mode)}
          >
            {modeLabels[mode]}
          </button>
        ))}
      </nav>

      <details className="fr-original">
        <summary>{t("showOriginal")}</summary>
        <div>{state.originalText}</div>
      </details>

      <div className="fr-output-shell" data-state={state.value}>
        {state.value === "requesting" && !hasOutput ? (
          <div className="fr-loading-row" role="status">
            <span className="fr-loading-orbit" aria-hidden="true" />
            {t("connecting")}
          </div>
        ) : null}
        {hasOutput ? <div className="fr-output-text">{state.output}</div> : null}
        {state.value === "streaming" ? (
          <span className="fr-stream-cursor" aria-hidden="true" />
        ) : null}
        {state.value === "cancelled" ? (
          <div className="fr-inline-status" role="status">
            {t("cancelled")}
          </div>
        ) : null}
        {state.value === "error" ? (
          <div className="fr-error-view" role="alert">
            <strong>{state.error.message}</strong>
            {state.error.suggestion ? <span>{state.error.suggestion}</span> : null}
          </div>
        ) : null}
      </div>

      <footer className="fr-panel-footer">
        <div className="fr-provider-tag">
          <span aria-hidden="true" />
          {"providerLabel" in state && state.providerLabel
            ? state.providerLabel
            : t("waitingProvider")}
          {"cached" in state && state.cached ? ` · ${t("cached")}` : ""}
        </div>
        <div className="fr-panel-actions">
          {isLoading ? (
            <button type="button" className="fr-secondary-button" onClick={onCancel}>
              {t("stop")}
            </button>
          ) : null}
          {hasOutput ? (
            <button type="button" className="fr-secondary-button" onClick={() => void copyResult()}>
              {t("copy")}
            </button>
          ) : null}
          {!isLoading ? (
            <button type="button" className="fr-primary-button" onClick={onRetry}>
              {t("retry")}
            </button>
          ) : null}
          {state.value === "error" && state.error.code === "PROVIDER_NOT_CONFIGURED" ? (
            <button
              type="button"
              className="fr-primary-button"
              onClick={() =>
                void chrome.runtime.sendMessage({ type: "OPEN_OPTIONS", section: "provider" })
              }
            >
              {t("openSettings")}
            </button>
          ) : null}
        </div>
      </footer>
      <div className="fr-copy-status" aria-live="polite">
        {copyStatus}
      </div>
    </section>
  );
}
