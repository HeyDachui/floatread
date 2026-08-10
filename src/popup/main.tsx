import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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

  const enableCurrentSite = async (): Promise<void> => {
    if (!state?.currentOrigin) return;
    setBusy(true);
    setStatus(t("popupEnablingSite"));
    try {
      const granted = await chrome.permissions.request({
        origins: [`${state.currentOrigin}/*`],
      });
      if (!granted) {
        setStatus(t("popupPermissionDenied"));
        return;
      }
      const response = await send(withTarget({ type: "ENABLE_CURRENT_SITE" }));
      if (!acceptState(response)) {
        setStatus(response.ok ? t("popupError") : response.error.message);
      }
    } catch {
      setStatus(t("popupPermissionDenied"));
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
                    : !state.siteAccess
                      ? t("popupSiteNeedsAccess")
                      : t(state.sitePaused ? "popupSitePaused" : "popupSiteActive")}
                </strong>
                {state.currentOrigin ? <small>{state.currentOrigin}</small> : null}
                {state.supportedPage && !state.siteAccess ? (
                  <small>{t("popupSiteAccessReason")}</small>
                ) : null}
              </div>
              <span
                className="status-dot"
                data-active={state.supportedPage && state.siteAccess && !state.sitePaused}
              />
            </div>
            <div className="popup-actions">
              {!state.siteAccess ? (
                <button
                  type="button"
                  className="button primary"
                  disabled={busy || !state.supportedPage || !state.globalEnabled}
                  onClick={() => void enableCurrentSite()}
                >
                  {t("popupEnableSite")}
                </button>
              ) : (
                <button
                  type="button"
                  className="button primary"
                  disabled={busy || !state.supportedPage || !state.globalEnabled}
                  onClick={() =>
                    void update({ type: "SET_SITE_PAUSED_CURRENT", paused: !state.sitePaused })
                  }
                >
                  {t(state.sitePaused ? "popupResumeSite" : "popupPauseSite")}
                </button>
              )}
            </div>
          </section>

          <section className="popup-card usage-card">
            <span className="row-label">
              {t(state.usage?.endedAt === null ? "usageCurrent" : "usageLast")}
            </span>
            {state.usage ? (
              <div className="usage-summary">
                <div>
                  <strong>{state.usage.inputTokens.toLocaleString()}</strong>
                  <span>{t("usageInput")}</span>
                </div>
                <div>
                  <strong>{state.usage.outputTokens.toLocaleString()}</strong>
                  <span>{t("usageOutput")}</span>
                </div>
                <div className="usage-total">
                  <strong>
                    {(state.usage.inputTokens + state.usage.outputTokens).toLocaleString()}
                  </strong>
                  <span>{t("usageTotal")}</span>
                </div>
              </div>
            ) : (
              <strong>{t("usageEmpty")}</strong>
            )}
            {state.usage ? (
              <small>
                {t("usageRequests", String(state.usage.requests))} ·{" "}
                {t("usageCacheHits", String(state.usage.cacheHits))}
              </small>
            ) : null}
          </section>

          <section className="popup-card compact skin-summary">
            <div className="summary-item">
              <span>{t("currentSkinSimple")}</span>
              <strong>{state.skin.name}</strong>
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
          {t("openSettingsSimple")}
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
