import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BRANDING } from "../config/branding";
import { createTranslator, resolveUiLocale } from "../i18n/catalog";
import type { BackgroundResponse } from "../shared/messages";
import { popupStateSchema, type PopupState } from "../shared/popup-state";
import "../shared/page.css";
import "./styles.css";

async function send(message: unknown): Promise<BackgroundResponse> {
  return (await chrome.runtime.sendMessage(message)) as BackgroundResponse;
}

export function PopupApp(): React.JSX.Element {
  const locale = resolveUiLocale();
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [state, setState] = useState<PopupState | null>(null);
  const [status, setStatus] = useState(t("popupLoading"));
  const [busy, setBusy] = useState(false);
  const targetTabId = Number(new URLSearchParams(window.location.search).get("targetTabId"));
  const withTarget = (message: Record<string, unknown>): Record<string, unknown> =>
    Number.isSafeInteger(targetTabId) && targetTabId > 0 ? { ...message, targetTabId } : message;

  const acceptState = (response: BackgroundResponse): boolean => {
    const parsed = response.ok ? popupStateSchema.safeParse(response.data) : null;
    if (!parsed?.success) return false;
    setState(parsed.data);
    setStatus("");
    return true;
  };

  const load = async (): Promise<void> => {
    try {
      if (!acceptState(await send(withTarget({ type: "GET_POPUP_STATE" })))) {
        setStatus(t("popupError"));
      }
    } catch {
      setStatus(t("popupError"));
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 750);
    return () => clearInterval(timer);
    // Popup lifetime polling keeps page-translation progress current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = async (message: unknown): Promise<void> => {
    setBusy(true);
    try {
      const response = await send(withTarget(message as Record<string, unknown>));
      if (!acceptState(response)) setStatus(response.ok ? t("popupError") : response.error.message);
    } catch {
      setStatus(t("popupError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="popup-shell"
      style={
        state
          ? ({
              "--popup-accent": state.skin.panel.accent,
              "--popup-border": state.skin.panel.border,
            } as React.CSSProperties)
          : undefined
      }
    >
      <header className="popup-header">
        <div className="popup-mark" aria-hidden="true">
          F
        </div>
        <div>
          <div className="popup-kicker">{t("popupKicker")}</div>
          <h1>{t("productName")}</h1>
        </div>
      </header>

      {state ? (
        <>
          <section className="popup-master" aria-labelledby="global-title">
            <div>
              <strong id="global-title">
                {t(state.globalEnabled ? "popupEnabled" : "popupPaused")}
              </strong>
              <span>{t("popupGlobalHint")}</span>
            </div>
            <label className="switch">
              <span className="visually-hidden">{t("popupEnabled")}</span>
              <input
                type="checkbox"
                checked={state.globalEnabled}
                disabled={busy}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setState({ ...state, globalEnabled: enabled });
                  void update({ type: "SET_GLOBAL_ENABLED", enabled });
                }}
              />
              <span aria-hidden="true" />
            </label>
          </section>

          <section className="popup-card">
            <div className="popup-row">
              <div>
                <span className="row-label">{t("popupCurrentPage")}</span>
                <strong>
                  {!state.supportedPage
                    ? t("popupUnsupported")
                    : t(state.sitePaused ? "popupSitePaused" : "popupSiteActive")}
                </strong>
                {state.currentOrigin ? <small>{state.currentOrigin}</small> : null}
              </div>
              <span className="status-dot" data-active={state.companionVisible} />
            </div>
            <div className="popup-actions two-up">
              <button
                type="button"
                className="button subtle"
                disabled={busy || !state.supportedPage}
                onClick={() =>
                  void update({ type: "SET_SITE_PAUSED_CURRENT", paused: !state.sitePaused })
                }
              >
                {t(state.sitePaused ? "popupResumeSite" : "popupPauseSite")}
              </button>
              <button
                type="button"
                className="button primary"
                disabled={busy || !state.supportedPage || !state.globalEnabled || state.sitePaused}
                onClick={() =>
                  void update({
                    type: "SET_CURRENT_TAB_COMPANION",
                    visible: !state.companionVisible,
                  })
                }
              >
                {t(state.companionVisible ? "popupHide" : "popupShow")}
              </button>
            </div>
          </section>

          <section className="popup-card translator-card">
            <div className="popup-row">
              <div>
                <span className="row-label">{t("popupPageTranslation")}</span>
                <strong>
                  {t(
                    state.pageTranslation.status === "translating" ||
                      state.pageTranslation.status === "scanning"
                      ? "popupTranslationRunning"
                      : state.pageTranslation.status === "watching"
                        ? "popupTranslationWatching"
                        : state.pageTranslation.status === "paused"
                          ? "popupTranslationPaused"
                          : state.pageTranslation.status === "error"
                            ? "popupTranslationError"
                            : "popupTranslationOff",
                  )}
                </strong>
                <small>
                  {t("popupTranslatedCount", String(state.pageTranslation.translatedCount))}
                </small>
              </div>
              <span className="translation-pulse" data-active={state.pageTranslation.active} />
            </div>
            <div className="popup-actions two-up">
              <button
                type="button"
                className="button primary"
                disabled={busy || !state.supportedPage || !state.globalEnabled || state.sitePaused}
                onClick={() =>
                  void update({
                    type: "CONTROL_PAGE_TRANSLATION_CURRENT",
                    action: state.pageTranslation.active ? "pause" : "start",
                  })
                }
              >
                {t(
                  state.pageTranslation.active
                    ? "popupPauseTranslation"
                    : state.pageTranslation.enabled
                      ? "popupResumeTranslation"
                      : "popupStartTranslation",
                )}
              </button>
              <button
                type="button"
                className="button subtle"
                disabled={
                  busy ||
                  (!state.pageTranslation.enabled && state.pageTranslation.translatedCount === 0)
                }
                onClick={() =>
                  void update({ type: "CONTROL_PAGE_TRANSLATION_CURRENT", action: "clear" })
                }
              >
                {t("popupClearTranslations")}
              </button>
            </div>
          </section>

          <section className="popup-card compact">
            <div className="summary-item">
              <span>{t("popupProvider")}</span>
              <strong>{state.provider.label ?? t("popupNotConfigured")}</strong>
              <small>
                {state.provider.configured
                  ? `${state.provider.model ?? ""} · ${t("popupConfigured")}`
                  : t("popupNotConfigured")}
              </small>
            </div>
            <div className="summary-item">
              <span>{t("popupSkin")}</span>
              <strong>{state.skin.name}</strong>
              <small>{state.skin.id}</small>
            </div>
          </section>
        </>
      ) : (
        <div className="popup-loading" role="status">
          {status}
        </div>
      )}

      <div className="popup-status" role="status" aria-live="polite">
        {state ? status : ""}
      </div>
      <footer className="popup-footer">
        <button type="button" onClick={() => void chrome.runtime.openOptionsPage()}>
          {t("popupSettings")}
        </button>
        <button type="button" onClick={() => void chrome.tabs.create({ url: BRANDING.githubUrl })}>
          {t("popupGithub")}
        </button>
      </footer>
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PopupApp />
    </StrictMode>,
  );
}
