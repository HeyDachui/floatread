import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { cacheStatusSchema } from "../cache/schemas";
import type { CachePolicy, CacheStats } from "../cache/types";
import { CompanionArtwork } from "../companion/CompanionArtwork";
import { createProviderProfile, PROVIDER_DEFAULTS, validateProviderUrl } from "../providers/config";
import { connectionTestResultSchema, providerProfilesSchema } from "../providers/schemas";
import type {
  ConnectionTestResult,
  ProviderKind,
  ProviderProfile,
  SecretStorageMode,
} from "../providers/types";
import type { BackgroundResponse } from "../shared/messages";
import { publicBootstrapSchema } from "../shared/schemas";
import type { AppearanceOverrides } from "../shared/types";
import { exportSkinPackage } from "../skins/package-export";
import { SkinImportError, validateSkinPackage } from "../skins/package-validator";
import { runtimeSkinSchema } from "../skins/schema";
import { getInstalledSkinManifest, getSkinAsset, installSkinPackage } from "../skins/storage";
import type { RuntimeSkinDefinition, SkinState } from "../skins/types";
import "../companion/styles.css";
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

const DEFAULT_CACHE_POLICY: CachePolicy = {
  mode: "persistent",
  ttlDays: 7,
  maxEntries: 200,
  maxBytes: 10_000_000,
};

const DEFAULT_APPEARANCE: AppearanceOverrides = {
  companionSize: 58,
  companionOpacity: 0.9,
  panelWidth: 380,
  panelOpacity: 0.96,
  fontScale: 1,
  cornerRadius: 16,
  motionEnabled: true,
  motionIntensity: 1,
  snapMargin: 12,
};

const SKIN_STATES: SkinState[] = ["idle", "ready", "thinking", "success", "error"];

function formatBytes(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

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
  const [cachePolicy, setCachePolicy] = useState<CachePolicy>(DEFAULT_CACHE_POLICY);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    entries: 0,
    bytes: 0,
    expiredRemoved: 0,
  });
  const [skins, setSkins] = useState<RuntimeSkinDefinition[]>([]);
  const [activeSkinId, setActiveSkinIdState] = useState("native");
  const [previewSkinId, setPreviewSkinId] = useState("native");
  const [previewState, setPreviewState] = useState<SkinState>("idle");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>(undefined);
  const [appearance, setAppearance] = useState<AppearanceOverrides>(DEFAULT_APPEARANCE);

  const requiresSecret = PROVIDER_DEFAULTS[draft.kind].requiresSecret;
  const urlValidation = useMemo(() => validateProviderUrl(draft), [draft]);
  const previewSkin = skins.find((skin) => skin.id === previewSkinId) ?? skins[0];
  const activeSkin = skins.find((skin) => skin.id === activeSkinId);

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

  const loadCacheStatus = async (): Promise<void> => {
    const response = await send({ type: "GET_CACHE_STATUS" });
    const parsed = response.ok ? cacheStatusSchema.safeParse(response.data) : null;
    if (!parsed?.success) return;
    setCachePolicy(parsed.data.policy);
    setCacheStats(parsed.data.stats);
  };

  const loadSkins = async (): Promise<void> => {
    const [listResponse, bootstrapResponse] = await Promise.all([
      send({ type: "LIST_RUNTIME_SKINS" }),
      send({ type: "GET_PUBLIC_BOOTSTRAP" }),
    ]);
    const list = listResponse.ok
      ? runtimeSkinSchema.array().max(56).safeParse(listResponse.data)
      : null;
    const bootstrap = bootstrapResponse.ok
      ? publicBootstrapSchema.safeParse(bootstrapResponse.data)
      : null;
    if (list?.success) setSkins(list.data);
    if (bootstrap?.success) {
      setActiveSkinIdState(bootstrap.data.activeSkinId);
      setPreviewSkinId(bootstrap.data.activeSkinId);
      setAppearance(bootstrap.data.appearance);
    }
  };

  useEffect(() => {
    void loadProfiles();
    void loadCacheStatus();
    void loadSkins();
  }, []);

  useEffect(() => {
    if (!previewSkin || previewSkin.source !== "community") {
      setPreviewImageUrl(undefined);
      return;
    }
    let objectUrl: string | undefined;
    let current = true;
    void getInstalledSkinManifest(previewSkin.id).then(async (manifest) => {
      if (!manifest) return;
      const path = manifest.assets[previewState] ?? manifest.assets.idle;
      const asset = await getSkinAsset(previewSkin.id, path);
      if (!asset || !current) return;
      objectUrl = URL.createObjectURL(new Blob([asset.bytes], { type: asset.mime }));
      setPreviewImageUrl(objectUrl);
    });
    return () => {
      current = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewSkin, previewState]);

  const saveCachePolicy = async (): Promise<void> => {
    setBusy(true);
    try {
      const response = await send({ type: "UPDATE_CACHE_POLICY", cache: cachePolicy });
      setStatus(response.ok ? "缓存策略已保存。" : "缓存策略保存失败。");
      await loadCacheStatus();
    } finally {
      setBusy(false);
    }
  };

  const clearCache = async (): Promise<void> => {
    setBusy(true);
    try {
      await send({ type: "CLEAR_RESULT_CACHE" });
      await loadCacheStatus();
      setStatus("AI 结果缓存已清空；Provider 配置和凭据未受影响。");
    } finally {
      setBusy(false);
    }
  };

  const activateSkin = async (skinId: string): Promise<void> => {
    setBusy(true);
    try {
      const response = await send({ type: "ACTIVATE_SKIN", skinId });
      if (!response.ok) throw new Error("activate failed");
      setActiveSkinIdState(skinId);
      setPreviewSkinId(skinId);
      setStatus("皮肤已应用到打开的 FloatRead 助手，无需刷新网页。");
    } catch {
      setStatus("皮肤切换失败，请重新加载扩展后重试。");
    } finally {
      setBusy(false);
    }
  };

  const saveAppearance = async (next = appearance): Promise<void> => {
    setBusy(true);
    try {
      const response = await send({ type: "UPDATE_APPEARANCE", appearance: next });
      setStatus(response.ok ? "外观设置已应用，无需刷新网页。" : "外观设置保存失败。");
    } finally {
      setBusy(false);
    }
  };

  const restoreSkinDefaults = async (): Promise<void> => {
    setAppearance(DEFAULT_APPEARANCE);
    await saveAppearance(DEFAULT_APPEARANCE);
    await activateSkin("native");
    setStatus("已恢复 Native 皮肤和默认外观。Provider 与缓存设置未改变。");
  };

  const importSkin = async (file: File): Promise<void> => {
    if (!file.name.toLowerCase().endsWith(".floatread-skin")) {
      setStatus("请选择扩展名为 .floatread-skin 的皮肤包。");
      return;
    }
    setBusy(true);
    try {
      const validated = await validateSkinPackage(new Uint8Array(await file.arrayBuffer()));
      await installSkinPackage(validated);
      await loadSkins();
      await activateSkin(validated.manifest.id);
      setStatus(`已安全导入并应用 ${validated.manifest.name}。`);
    } catch (error) {
      const reason =
        error instanceof SkinImportError
          ? `${error.message}${error.fileName ? `（${error.fileName}）` : ""}`
          : error instanceof Error
            ? error.message
            : "未知错误";
      setStatus(`皮肤导入失败：${reason}`);
    } finally {
      setBusy(false);
    }
  };

  const exportSkin = async (): Promise<void> => {
    setBusy(true);
    try {
      const blob = await exportSkinPackage(previewSkinId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${previewSkinId}.floatread-skin`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("皮肤包已导出；其中不包含任何 Provider 凭据。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "皮肤导出失败。");
    } finally {
      setBusy(false);
    }
  };

  const deleteSkin = async (): Promise<void> => {
    const skin = skins.find((item) => item.id === previewSkinId);
    if (!skin || skin.source !== "community") return;
    setBusy(true);
    try {
      await send({ type: "DELETE_INSTALLED_SKIN", skinId: skin.id });
      await loadSkins();
      setPreviewSkinId("native");
      setActiveSkinIdState(activeSkinId === skin.id ? "native" : activeSkinId);
      setStatus("社区皮肤及其本地资源已删除。");
    } finally {
      setBusy(false);
    }
  };

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
    <main
      className="options-shell"
      data-active-skin={activeSkin?.variant ?? "native"}
      style={
        activeSkin
          ? ({
              "--option-accent": activeSkin.panel.accent,
              "--option-accent-soft": `${activeSkin.panel.accent}24`,
              "--option-border": activeSkin.panel.border,
            } as React.CSSProperties)
          : undefined
      }
    >
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

      <section className="settings-card skin-card" aria-labelledby="skin-title">
        <div className="card-heading">
          <div>
            <div className="section-label">VERSIONED SKIN ENGINE</div>
            <h2 id="skin-title">皮肤与实时预览</h2>
          </div>
          <span className="privacy-chip">只改变 FloatRead</span>
        </div>
        <div className="skin-workbench">
          <div className="skin-library" aria-label="皮肤列表">
            {skins.map((skin) => (
              <button
                key={skin.id}
                type="button"
                className={skin.id === previewSkinId ? "skin-choice active" : "skin-choice"}
                onClick={() => setPreviewSkinId(skin.id)}
              >
                <span>{skin.name}</span>
                <small>
                  {skin.source === "builtin" ? "内置原创" : "社区皮肤"}
                  {skin.id === activeSkinId ? " · 使用中" : ""}
                </small>
              </button>
            ))}
          </div>

          {previewSkin ? (
            <div
              className="skin-preview-stage fr-companion-layer"
              data-skin={previewSkin.variant}
              style={
                {
                  "--fr-accent": previewSkin.panel.accent,
                  "--fr-bg": previewSkin.panel.background,
                  "--fr-bg-elevated": previewSkin.panel.backgroundElevated,
                  "--fr-text": previewSkin.panel.text,
                  "--fr-text-muted": previewSkin.panel.textMuted,
                  "--fr-border": previewSkin.panel.border,
                  "--fr-success": previewSkin.panel.success,
                  "--fr-error": previewSkin.panel.error,
                  "--fr-companion-size": `${appearance.companionSize}px`,
                  "--fr-companion-opacity": appearance.companionOpacity,
                } as React.CSSProperties
              }
            >
              <div className={`fr-companion fr-state-${previewState}`} data-motion="none">
                <CompanionArtwork state={previewState} communityImageUrl={previewImageUrl} />
              </div>
              <strong>{previewSkin.name}</strong>
              <div className="preview-state-tabs" aria-label="预览状态">
                {SKIN_STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    aria-pressed={previewState === state}
                    onClick={() => setPreviewState(state)}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <p className="cache-intro">
          社区包仅允许严格 JSON、PNG 和 WebP；JavaScript、HTML、SVG、CSS、字体、远程
          URL、路径穿越和异常压缩包都会被拒绝。
        </p>
        <div className="appearance-controls">
          <label>
            <span>助手大小：{appearance.companionSize}px</span>
            <input
              aria-label="助手大小"
              type="range"
              min={40}
              max={96}
              value={appearance.companionSize}
              onChange={(event) =>
                setAppearance({ ...appearance, companionSize: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>助手透明度：{Math.round(appearance.companionOpacity * 100)}%</span>
            <input
              aria-label="助手透明度"
              type="range"
              min={35}
              max={100}
              value={Math.round(appearance.companionOpacity * 100)}
              onChange={(event) =>
                setAppearance({ ...appearance, companionOpacity: Number(event.target.value) / 100 })
              }
            />
          </label>
          <label>
            <span>结果面板宽度：{appearance.panelWidth}px</span>
            <input
              aria-label="结果面板宽度"
              type="range"
              min={320}
              max={520}
              value={appearance.panelWidth}
              onChange={(event) =>
                setAppearance({ ...appearance, panelWidth: Number(event.target.value) })
              }
            />
          </label>
          <label className="motion-toggle">
            <input
              type="checkbox"
              checked={appearance.motionEnabled}
              onChange={(event) =>
                setAppearance({ ...appearance, motionEnabled: event.target.checked })
              }
            />
            <span>启用内置动画（系统“减少动态效果”始终优先）</span>
          </label>
        </div>
        <div className="form-actions">
          <label className="button secondary file-button">
            导入 .floatread-skin
            <input
              type="file"
              accept=".floatread-skin,application/zip"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importSkin(file);
                event.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={busy || !previewSkin}
            onClick={() => void exportSkin()}
          >
            导出当前皮肤
          </button>
          {previewSkin?.source === "community" ? (
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => void deleteSkin()}
            >
              删除社区皮肤
            </button>
          ) : null}
          <button
            type="button"
            className="button ghost"
            disabled={busy}
            onClick={() => void restoreSkinDefaults()}
          >
            恢复默认
          </button>
          <span className="action-spacer" />
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void saveAppearance()}
          >
            保存外观
          </button>
          <button
            type="button"
            className="button primary"
            disabled={busy || !previewSkin || activeSkinId === previewSkinId}
            onClick={() => void activateSkin(previewSkinId)}
          >
            应用皮肤
          </button>
        </div>
      </section>

      <section className="settings-card cache-card" aria-labelledby="cache-title">
        <div className="card-heading">
          <div>
            <div className="section-label">LOCAL RESULT CACHE</div>
            <h2 id="cache-title">结果缓存</h2>
          </div>
          <span className="privacy-chip">
            {cacheStats.entries} 条 · {formatBytes(cacheStats.bytes)}
          </span>
        </div>
        <p className="cache-intro">
          相同文本、模式、Provider、Base URL、模型和 Prompt 版本才会命中。缓存永远不包含 API Key。
        </p>
        <div className="cache-controls">
          <label>
            <span>保存位置</span>
            <select
              value={cachePolicy.mode}
              onChange={(event) =>
                setCachePolicy({
                  ...cachePolicy,
                  mode: event.target.value as CachePolicy["mode"],
                })
              }
            >
              <option value="persistent">持久保存在本机</option>
              <option value="session">仅本次浏览器会话</option>
              <option value="off">关闭缓存</option>
            </select>
          </label>
          <label>
            <span>过期时间</span>
            <select
              value={cachePolicy.ttlDays}
              onChange={(event) =>
                setCachePolicy({ ...cachePolicy, ttlDays: Number(event.target.value) })
              }
            >
              <option value={1}>1 天</option>
              <option value={7}>7 天</option>
              <option value={30}>30 天</option>
              <option value={90}>90 天</option>
            </select>
          </label>
          <label>
            <span>最多条目</span>
            <input
              type="number"
              min={1}
              max={2_000}
              value={cachePolicy.maxEntries}
              onChange={(event) =>
                setCachePolicy({ ...cachePolicy, maxEntries: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>最大容量</span>
            <select
              value={cachePolicy.maxBytes}
              onChange={(event) =>
                setCachePolicy({ ...cachePolicy, maxBytes: Number(event.target.value) })
              }
            >
              <option value={5_000_000}>5 MB</option>
              <option value={10_000_000}>10 MB</option>
              <option value={25_000_000}>25 MB</option>
              <option value={50_000_000}>50 MB</option>
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="button danger"
            disabled={busy}
            onClick={() => void clearCache()}
          >
            清空缓存
          </button>
          <span className="action-spacer" />
          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={() => void saveCachePolicy()}
          >
            保存缓存设置
          </button>
        </div>
      </section>
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
