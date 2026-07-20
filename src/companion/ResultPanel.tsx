import { useEffect, useRef, useState } from "react";
import type { ReaderMode } from "../shared/types";
import type { ReaderState } from "./reader-reducer";

interface ResultPanelProps {
  state: Exclude<ReaderState, { value: "idle" }>;
  focusOnOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onSwitchMode: (mode: ReaderMode) => void;
}

const MODE_LABELS: Record<ReaderMode, string> = {
  natural_zh: "自然中文",
  key_points: "看懂重点",
  explain_terms: "解释术语",
};

export function ResultPanel({
  state,
  focusOnOpen,
  onClose,
  onCancel,
  onRetry,
  onSwitchMode,
}: ResultPanelProps): React.JSX.Element {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const isLoading = state.value === "requesting" || state.value === "streaming";
  const hasOutput = state.output.length > 0;

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
      setCopyStatus("已复制");
    } catch {
      setCopyStatus("复制失败，请手动选择结果文本");
    }
  };

  return (
    <section className="fr-result-panel" aria-label="FloatRead 阅读结果">
      <header className="fr-panel-header">
        <div>
          <div className="fr-panel-kicker">FLOATREAD</div>
          <h2>{MODE_LABELS[state.mode]}</h2>
        </div>
        <button
          ref={closeButtonRef}
          className="fr-icon-button"
          type="button"
          aria-label="关闭结果面板"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <nav className="fr-mode-tabs" aria-label="切换阅读模式">
        {(Object.keys(MODE_LABELS) as ReaderMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-current={state.mode === mode ? "page" : undefined}
            onClick={() => onSwitchMode(mode)}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </nav>

      <details className="fr-original">
        <summary>查看原文</summary>
        <div>{state.originalText}</div>
      </details>

      <div className="fr-output-shell" data-state={state.value}>
        {state.value === "requesting" && !hasOutput ? (
          <div className="fr-loading-row" role="status">
            <span className="fr-loading-orbit" aria-hidden="true" />
            正在建立安全连接…
          </div>
        ) : null}
        {hasOutput ? <div className="fr-output-text">{state.output}</div> : null}
        {state.value === "streaming" ? (
          <span className="fr-stream-cursor" aria-hidden="true" />
        ) : null}
        {state.value === "cancelled" ? (
          <div className="fr-inline-status" role="status">
            请求已停止，已保留收到的内容。
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
          {"providerLabel" in state && state.providerLabel ? state.providerLabel : "等待 Provider"}
          {"cached" in state && state.cached ? " · 缓存" : ""}
        </div>
        <div className="fr-panel-actions">
          {isLoading ? (
            <button type="button" className="fr-secondary-button" onClick={onCancel}>
              停止
            </button>
          ) : null}
          {hasOutput ? (
            <button type="button" className="fr-secondary-button" onClick={() => void copyResult()}>
              复制
            </button>
          ) : null}
          {!isLoading ? (
            <button type="button" className="fr-primary-button" onClick={onRetry}>
              重试
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
              打开设置
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
