import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createProviderProfile, PROVIDER_DEFAULTS, validateProviderUrl } from "../providers/config";
import { connectionTestResultSchema, providerProfilesSchema } from "../providers/schemas";
import type {
  ConnectionTestResult,
  ProviderKind,
  ProviderProfile,
  SecretStorageMode,
} from "../providers/types";
import type { BackgroundResponse } from "../shared/messages";
import "../shared/page.css";
import "./styles.css";

const PROVIDER_ORDER: ProviderKind[] = [
  "openai",
  "openai_compatible",
  "deepseek",
  "anthropic",
  "gemini",
  "ollama",
];

async function send(message: unknown): Promise<BackgroundResponse> {
  return (await chrome.runtime.sendMessage(message)) as BackgroundResponse;
}

function updated(profile: ProviderProfile, patch: Partial<ProviderProfile>): ProviderProfile {
  return { ...profile, ...patch, updatedAt: Date.now() };
}

export function OptionsApp(): React.JSX.Element {
  const [profiles, setProfiles] = useState<ProviderProfile[]>([]);
  const [draft, setDraft] = useState<ProviderProfile>(() => createProviderProfile("openai"));
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<string>("正在读取本地设置…");
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const requiresSecret = PROVIDER_DEFAULTS[draft.kind].requiresSecret;
  const urlValidation = useMemo(() => validateProviderUrl(draft), [draft]);

  const loadProfiles = async (preferredId?: string): Promise<void> => {
    const response = await send({ type: "LIST_PROVIDER_PROFILES" });
    const parsed = response.ok ? providerProfilesSchema.safeParse(response.data) : null;
    if (!parsed?.success) {
      setStatus("无法读取 Provider 配置。请重新加载扩展后重试。");
      return;
    }
    setProfiles(parsed.data);
    const selected = parsed.data.find((item) => item.id === preferredId) ?? parsed.data[0];
    if (selected) setDraft(selected);
    setStatus(parsed.data.length > 0 ? "配置只保存在本机浏览器。" : "请创建第一个 Provider 配置。");
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

  const save = async (): Promise<boolean> => {
    if (!urlValidation.valid) {
      setStatus(urlValidation.error.message);
      return false;
    }
    setBusy(true);
    try {
      const response = await send({
        type: "SAVE_PROVIDER_PROFILE",
        profile: draft,
        ...(secret.trim() ? { secret } : {}),
      });
      if (!response.ok) {
        setStatus("保存失败，请检查配置。");
        return false;
      }
      await send({ type: "ACTIVATE_PROVIDER_PROFILE", profileId: draft.id });
      await loadProfiles(draft.id);
      setSecret("");
      setStatus("已保存并设为当前 Provider。API Key 不会显示在配置列表中。");
      return true;
    } finally {
      setBusy(false);
    }
  };

  const authorizeAndTest = async (): Promise<void> => {
    if (!urlValidation.valid) {
      setStatus(urlValidation.error.message);
      return;
    }
    setBusy(true);
    setTestResult(null);
    try {
      setStatus(`FloatRead 需要访问 ${urlValidation.url.origin} 才能由 Background 调用模型。`);
      const granted = await chrome.permissions.request({ origins: [urlValidation.permission] });
      if (!granted) {
        setStatus("你拒绝了域名权限；配置仍可保存，但不会发起请求。");
        return;
      }
      const saved = await save();
      if (!saved) return;
      setBusy(true);
      setStatus("正在发送一次最小连接测试；Provider 可能计费少量 Token…");
      const response = await send({ type: "TEST_PROVIDER_CONNECTION", profileId: draft.id });
      const parsed = response.ok ? connectionTestResultSchema.safeParse(response.data) : null;
      if (!parsed?.success) {
        setStatus("连接测试返回格式异常。");
        return;
      }
      setTestResult(parsed.data as ConnectionTestResult);
      setStatus(
        parsed.data.ok
          ? `连接成功，总耗时 ${parsed.data.totalMs} ms。`
          : (parsed.data.error?.message ?? "连接失败。"),
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    setBusy(true);
    try {
      await send({ type: "DELETE_PROVIDER_PROFILE", profileId: draft.id });
      const next = createProviderProfile("openai");
      setDraft(next);
      setSecret("");
      setTestResult(null);
      await loadProfiles();
      setStatus("Provider 配置及对应凭据已删除。");
    } finally {
      setBusy(false);
    }
  };

  const clearSecret = async (): Promise<void> => {
    await send({ type: "CLEAR_PROVIDER_SECRET", profileId: draft.id });
    setSecret("");
    setStatus("该 Provider 的本地、会话和内存凭据均已清除。");
  };

  return (
    <main className="options-shell">
      <header className="options-hero">
        <div>
          <div className="eyebrow">LOCAL-FIRST READING COMPANION</div>
          <h1>FloatRead 设置</h1>
          <p>请求从浏览器直接发送到你选择的 Provider，FloatRead 不设开发者服务器。</p>
        </div>
        <div className="privacy-chip">无账号 · 无遥测 · BYOK</div>
      </header>

      <div className="options-grid">
        <aside className="profile-rail" aria-label="Provider 配置列表">
          <div className="section-label">PROVIDERS</div>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className={profile.id === draft.id ? "profile-card active" : "profile-card"}
              onClick={() => {
                setDraft(profile);
                setSecret("");
                setTestResult(null);
              }}
            >
              <strong>{profile.displayName}</strong>
              <span>{profile.model}</span>
            </button>
          ))}
          <button
            type="button"
            className="add-profile"
            onClick={() => {
              setDraft(createProviderProfile("openai"));
              setSecret("");
              setTestResult(null);
              setStatus("正在创建新配置，尚未保存。");
            }}
          >
            ＋ 新建配置
          </button>
        </aside>

        <section className="settings-card" aria-labelledby="provider-title">
          <div className="card-heading">
            <div>
              <div className="section-label">ACTIVE PROVIDER</div>
              <h2 id="provider-title">连接你自己的 AI</h2>
            </div>
            <span className="connection-dot" data-ok={testResult?.ok ?? false}>
              {testResult?.ok ? "已验证" : "未验证"}
            </span>
          </div>

          <div className="form-grid">
            <label>
              <span>Provider 类型</span>
              <select
                value={draft.kind}
                onChange={(event) => {
                  const kind = event.target.value as ProviderKind;
                  const preset = PROVIDER_DEFAULTS[kind];
                  setDraft(
                    updated(draft, {
                      kind,
                      displayName: preset.displayName,
                      baseUrl: preset.baseUrl,
                      model: preset.modelExample,
                    }),
                  );
                  setSecret("");
                  setTestResult(null);
                }}
              >
                {PROVIDER_ORDER.map((kind) => (
                  <option key={kind} value={kind}>
                    {PROVIDER_DEFAULTS[kind].displayName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>显示名称</span>
              <input
                value={draft.displayName}
                maxLength={80}
                onChange={(event) => setDraft(updated(draft, { displayName: event.target.value }))}
              />
            </label>

            <label className="wide-field">
              <span>Base URL</span>
              <input
                value={draft.baseUrl}
                spellCheck={false}
                onChange={(event) => setDraft(updated(draft, { baseUrl: event.target.value }))}
              />
              <small>
                {urlValidation.valid
                  ? `只会申请 ${urlValidation.url.origin} 的访问权限`
                  : urlValidation.error.message}
              </small>
            </label>

            <label>
              <span>模型名</span>
              <input
                value={draft.model}
                spellCheck={false}
                onChange={(event) => setDraft(updated(draft, { model: event.target.value }))}
              />
              <small>示例名称可编辑，不依赖远程模型列表。</small>
            </label>

            <label>
              <span>请求超时</span>
              <select
                value={draft.timeoutMs}
                onChange={(event) =>
                  setDraft(updated(draft, { timeoutMs: Number(event.target.value) }))
                }
              >
                <option value={30_000}>30 秒</option>
                <option value={60_000}>60 秒</option>
                <option value={120_000}>120 秒</option>
              </select>
            </label>

            <fieldset className="wide-field storage-modes">
              <legend>API Key 保存方式</legend>
              {(
                [
                  ["session", "仅本次浏览器会话（推荐）", "浏览器重启或扩展重载后清除"],
                  ["local", "持久保存在本机", "方便，但浏览器本地存储不是硬件保险库"],
                  ["prompt_each_time", "每次使用时输入", "只进入 Service Worker 当前内存"],
                ] as Array<[SecretStorageMode, string, string]>
              ).map(([mode, title, detail]) => (
                <label key={mode} className="radio-card">
                  <input
                    type="radio"
                    name="storage-mode"
                    value={mode}
                    checked={draft.secretStorageMode === mode}
                    onChange={() => setDraft(updated(draft, { secretStorageMode: mode }))}
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                </label>
              ))}
            </fieldset>

            {requiresSecret ? (
              <label className="wide-field">
                <span>API Key</span>
                <input
                  type="password"
                  value={secret}
                  autoComplete="new-password"
                  placeholder="已保存的 Key 不会回显；留空可保留原值"
                  onChange={(event) => setSecret(event.target.value)}
                />
                {draft.secretStorageMode === "local" ? (
                  <small className="risk-note">
                    风险提示：拥有本机及浏览器调试权限的人仍可能读取此凭据。建议使用独立、低额度、可吊销的
                    Key。
                  </small>
                ) : null}
              </label>
            ) : (
              <div className="wide-field local-note">
                Ollama 默认无需 API Key，只允许 localhost 或 127.0.0.1 地址。
              </div>
            )}
          </div>

          <div className="status-line" role="status" aria-live="polite">
            {status}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              disabled={busy}
              onClick={() => void clearSecret()}
            >
              清除凭据
            </button>
            {profiles.some((profile) => profile.id === draft.id) ? (
              <button
                type="button"
                className="button danger"
                disabled={busy}
                onClick={() => void remove()}
              >
                删除配置
              </button>
            ) : null}
            <span className="action-spacer" />
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void save()}
            >
              保存
            </button>
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => void authorizeAndTest()}
            >
              {busy ? "处理中…" : "授权并测试连接"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <OptionsApp />
    </StrictMode>,
  );
}
