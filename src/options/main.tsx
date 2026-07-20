import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { cacheStatusSchema } from "../cache/schemas";
import type { CachePolicy, CacheStats } from "../cache/types";
import { CompanionArtwork } from "../companion/CompanionArtwork";
import { BRANDING } from "../config/branding";
import { createTranslator, resolveUiLocale } from "../i18n/catalog";
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
import type { AppearanceOverrides, ReaderMode } from "../shared/types";
import { readingPreferencesSchema, type ReadingPreferences } from "../shared/reading-preferences";
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

const DEFAULT_READING: ReadingPreferences = {
  defaultMode: "natural_zh",
  clickBehavior: "show_actions",
  locale: "auto",
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
  const [status, setStatus] = useState<string>("");
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
  const [reading, setReading] = useState<ReadingPreferences>(DEFAULT_READING);

  const requiresSecret = PROVIDER_DEFAULTS[draft.kind].requiresSecret;
  const urlValidation = useMemo(() => validateProviderUrl(draft), [draft]);
  const previewSkin = skins.find((skin) => skin.id === previewSkinId) ?? skins[0];
  const activeSkin = skins.find((skin) => skin.id === activeSkinId);
  const optionsLocale = reading.locale === "auto" ? resolveUiLocale() : reading.locale;
  const t = useMemo(() => createTranslator(optionsLocale), [optionsLocale]);

  const loadProfiles = async (preferredId?: string): Promise<void> => {
    const response = await send({ type: "LIST_PROVIDER_PROFILES" });
    const parsed = response.ok ? providerProfilesSchema.safeParse(response.data) : null;
    if (!parsed?.success) {
      setStatus(t("statusLoadFailed"));
      return;
    }
    setProfiles(parsed.data);
    const selected = parsed.data.find((item) => item.id === preferredId) ?? parsed.data[0];
    if (selected) setDraft(selected);
    setStatus(parsed.data.length > 0 ? t("statusProfilesLocal") : t("statusCreateProfile"));
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

  const loadReadingPreferences = async (): Promise<void> => {
    const response = await send({ type: "GET_READING_PREFERENCES" });
    const parsed = response.ok ? readingPreferencesSchema.safeParse(response.data) : null;
    if (parsed?.success) setReading(parsed.data);
  };

  useEffect(() => {
    void loadProfiles();
    void loadCacheStatus();
    void loadSkins();
    void loadReadingPreferences();
    // Initial extension-page hydration only; later mutations refresh their own sections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setStatus(t(response.ok ? "statusCacheSaved" : "statusCacheFailed"));
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
      setStatus(t("statusCacheCleared"));
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
      setStatus(t("statusSkinApplied"));
    } catch {
      setStatus(t("statusSkinFailed"));
    } finally {
      setBusy(false);
    }
  };

  const saveAppearance = async (next = appearance): Promise<void> => {
    setBusy(true);
    try {
      const response = await send({ type: "UPDATE_APPEARANCE", appearance: next });
      setStatus(t(response.ok ? "statusAppearanceSaved" : "statusAppearanceFailed"));
    } finally {
      setBusy(false);
    }
  };

  const saveReadingPreferences = async (): Promise<void> => {
    setBusy(true);
    try {
      const response = await send({ type: "UPDATE_READING_PREFERENCES", ...reading });
      setStatus(t(response.ok ? "statusReadingSaved" : "statusReadingFailed"));
    } finally {
      setBusy(false);
    }
  };

  const restoreSkinDefaults = async (): Promise<void> => {
    setAppearance(DEFAULT_APPEARANCE);
    await saveAppearance(DEFAULT_APPEARANCE);
    await activateSkin("native");
    setStatus(t("statusDefaultsRestored"));
  };

  const importSkin = async (file: File): Promise<void> => {
    if (!file.name.toLowerCase().endsWith(".floatread-skin")) {
      setStatus(t("statusChooseSkinPackage"));
      return;
    }
    setBusy(true);
    try {
      const validated = await validateSkinPackage(new Uint8Array(await file.arrayBuffer()));
      await installSkinPackage(validated);
      await loadSkins();
      await activateSkin(validated.manifest.id);
      setStatus(t("statusSkinImported", validated.manifest.name));
    } catch (error) {
      const reason =
        error instanceof SkinImportError
          ? `${error.message}${error.fileName ? `（${error.fileName}）` : ""}`
          : error instanceof Error
            ? error.message
            : t("statusUnknownError");
      setStatus(t("statusSkinImportFailed", reason));
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
      setStatus(t("statusSkinExported"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("statusSkinExportFailed"));
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
      setStatus(t("statusSkinDeleted"));
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
        setStatus(t("statusSaveFailed"));
        return false;
      }
      await send({ type: "ACTIVATE_PROVIDER_PROFILE", profileId: draft.id });
      await loadProfiles(draft.id);
      setSecret("");
      setStatus(t("statusSaved"));
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
      setStatus(t("statusPermission", urlValidation.url.origin));
      const granted = await chrome.permissions.request({ origins: [urlValidation.permission] });
      if (!granted) {
        setStatus(t("statusPermissionDenied"));
        return;
      }
      const saved = await save();
      if (!saved) return;
      setBusy(true);
      setStatus(t("statusTesting"));
      const response = await send({ type: "TEST_PROVIDER_CONNECTION", profileId: draft.id });
      const parsed = response.ok ? connectionTestResultSchema.safeParse(response.data) : null;
      if (!parsed?.success) {
        setStatus(t("statusInvalidTest"));
        return;
      }
      setTestResult(parsed.data as ConnectionTestResult);
      setStatus(
        parsed.data.ok
          ? t("statusConnected", String(parsed.data.totalMs))
          : (parsed.data.error?.message ?? t("statusConnectionFailed")),
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
      setStatus(t("statusDeletedProfile"));
    } finally {
      setBusy(false);
    }
  };

  const clearSecret = async (): Promise<void> => {
    await send({ type: "CLEAR_PROVIDER_SECRET", profileId: draft.id });
    setSecret("");
    setStatus(t("statusClearedCredential"));
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
          <h1>{t("settingsTitle")}</h1>
          <p>{t("settingsIntro")}</p>
        </div>
        <div className="privacy-chip">{t("privacyChip")}</div>
      </header>

      <div className="options-grid">
        <aside className="profile-rail" aria-label={t("profileList")}>
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
              setStatus(t("statusNewProfile"));
            }}
          >
            {t("newProfile")}
          </button>
        </aside>

        <section className="settings-card" aria-labelledby="provider-title">
          <div className="card-heading">
            <div>
              <div className="section-label">ACTIVE PROVIDER</div>
              <h2 id="provider-title">{t("connectOwnAi")}</h2>
            </div>
            <span className="connection-dot" data-ok={testResult?.ok ?? false}>
              {t(testResult?.ok ? "verified" : "unverified")}
            </span>
          </div>

          <div className="form-grid">
            <label>
              <span>{t("providerType")}</span>
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
              <span>{t("displayName")}</span>
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
                  ? t("exactPermission", urlValidation.url.origin)
                  : urlValidation.error.message}
              </small>
            </label>

            <label>
              <span>{t("modelName")}</span>
              <input
                value={draft.model}
                spellCheck={false}
                onChange={(event) => setDraft(updated(draft, { model: event.target.value }))}
              />
              <small>{t("modelHint")}</small>
            </label>

            <label>
              <span>{t("timeout")}</span>
              <select
                value={draft.timeoutMs}
                onChange={(event) =>
                  setDraft(updated(draft, { timeoutMs: Number(event.target.value) }))
                }
              >
                <option value={30_000}>{t("seconds", "30")}</option>
                <option value={60_000}>{t("seconds", "60")}</option>
                <option value={120_000}>{t("seconds", "120")}</option>
              </select>
            </label>

            <fieldset className="wide-field storage-modes">
              <legend>{t("keyStorage")}</legend>
              {(
                [
                  ["session", t("onboardingSession"), t("sessionDetail")],
                  ["local", t("onboardingLocal"), t("localDetail")],
                  ["prompt_each_time", t("onboardingPrompt"), t("promptDetail")],
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
                  placeholder={t("keyPlaceholder")}
                  onChange={(event) => setSecret(event.target.value)}
                />
                {draft.secretStorageMode === "local" ? (
                  <small className="risk-note">{t("keyRisk")}</small>
                ) : null}
              </label>
            ) : (
              <div className="wide-field local-note">{t("ollamaNoKey")}</div>
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
              {t("clearCredential")}
            </button>
            {profiles.some((profile) => profile.id === draft.id) ? (
              <button
                type="button"
                className="button danger"
                disabled={busy}
                onClick={() => void remove()}
              >
                {t("deleteProfile")}
              </button>
            ) : null}
            <span className="action-spacer" />
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void save()}
            >
              {t("save")}
            </button>
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => void authorizeAndTest()}
            >
              {t(busy ? "processing" : "authorizeTest")}
            </button>
          </div>
        </section>
      </div>

      <section className="settings-card behavior-card" aria-labelledby="behavior-title">
        <div className="card-heading">
          <div>
            <div className="section-label">READING & ACCESSIBILITY</div>
            <h2 id="behavior-title">{t("readingTitle")}</h2>
          </div>
        </div>
        <div className="behavior-controls">
          <label>
            <span>{t("defaultMode")}</span>
            <select
              value={reading.defaultMode}
              onChange={(event) =>
                setReading({ ...reading, defaultMode: event.target.value as ReaderMode })
              }
            >
              <option value="natural_zh">{t("modeNatural")}</option>
              <option value="key_points">{t("modePoints")}</option>
              <option value="explain_terms">{t("modeTerms")}</option>
            </select>
          </label>
          <label>
            <span>{t("clickBehavior")}</span>
            <select
              value={reading.clickBehavior}
              onChange={(event) =>
                setReading({
                  ...reading,
                  clickBehavior: event.target.value as ReadingPreferences["clickBehavior"],
                })
              }
            >
              <option value="show_actions">{t("showActions")}</option>
              <option value="run_default_mode">{t("runDefault")}</option>
            </select>
          </label>
          <label>
            <span>{t("interfaceLanguage")}</span>
            <select
              value={reading.locale}
              onChange={(event) =>
                setReading({
                  ...reading,
                  locale: event.target.value as ReadingPreferences["locale"],
                })
              }
            >
              <option value="auto">{t("languageAuto")}</option>
              <option value="zh_CN">{t("languageChinese")}</option>
              <option value="en">{t("languageEnglish")}</option>
            </select>
          </label>
        </div>
        <div className="shortcut-strip">
          <div>
            <strong>{t("shortcutTitle")}</strong>
            <span>{t("shortcutHint")}</span>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              void chrome.tabs
                .create({ url: "chrome://extensions/shortcuts" })
                .catch(() => setStatus(t("shortcutFallback")))
            }
          >
            {t("openShortcuts")}
          </button>
        </div>
        <div className="form-actions">
          <span className="action-spacer" />
          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={() => void saveReadingPreferences()}
          >
            {t("saveReading")}
          </button>
        </div>
      </section>

      <section className="settings-card skin-card" aria-labelledby="skin-title">
        <div className="card-heading">
          <div>
            <div className="section-label">VERSIONED SKIN ENGINE</div>
            <h2 id="skin-title">{t("skinTitle")}</h2>
          </div>
          <span className="privacy-chip">{t("onlyFloatRead")}</span>
        </div>
        <div className="skin-workbench">
          <div className="skin-library" aria-label={t("skinList")}>
            {skins.map((skin) => (
              <button
                key={skin.id}
                type="button"
                className={skin.id === previewSkinId ? "skin-choice active" : "skin-choice"}
                onClick={() => setPreviewSkinId(skin.id)}
              >
                <span>{skin.name}</span>
                <small>
                  {t(skin.source === "builtin" ? "builtinOriginal" : "communitySkin")}
                  {skin.id === activeSkinId ? ` · ${t("active")}` : ""}
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
              <div className="preview-state-tabs" aria-label={t("previewStates")}>
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
        <p className="cache-intro">{t("skinSecuritySummary")}</p>
        <div className="appearance-controls">
          <label>
            <span>{t("companionSize", String(appearance.companionSize))}</span>
            <input
              aria-label={t("companionSize", String(appearance.companionSize))}
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
            <span>
              {t("companionOpacity", String(Math.round(appearance.companionOpacity * 100)))}
            </span>
            <input
              aria-label={t(
                "companionOpacity",
                String(Math.round(appearance.companionOpacity * 100)),
              )}
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
            <span>{t("panelWidth", String(appearance.panelWidth))}</span>
            <input
              aria-label={t("panelWidth", String(appearance.panelWidth))}
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
            <span>{t("enableMotion")}</span>
          </label>
        </div>
        <div className="form-actions">
          <label className="button secondary file-button">
            {t("importSkin")}
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
            {t("exportSkin")}
          </button>
          {previewSkin?.source === "community" ? (
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => void deleteSkin()}
            >
              {t("deleteSkin")}
            </button>
          ) : null}
          <button
            type="button"
            className="button ghost"
            disabled={busy}
            onClick={() => void restoreSkinDefaults()}
          >
            {t("restoreDefault")}
          </button>
          <span className="action-spacer" />
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void saveAppearance()}
          >
            {t("saveAppearance")}
          </button>
          <button
            type="button"
            className="button primary"
            disabled={busy || !previewSkin || activeSkinId === previewSkinId}
            onClick={() => void activateSkin(previewSkinId)}
          >
            {t("applySkin")}
          </button>
        </div>
      </section>

      <section className="settings-card cache-card" aria-labelledby="cache-title">
        <div className="card-heading">
          <div>
            <div className="section-label">LOCAL RESULT CACHE</div>
            <h2 id="cache-title">{t("cacheTitle")}</h2>
          </div>
          <span className="privacy-chip">
            {t("cacheUsage", String(cacheStats.entries), formatBytes(cacheStats.bytes))}
          </span>
        </div>
        <p className="cache-intro">{t("cacheIntro")}</p>
        <div className="cache-controls">
          <label>
            <span>{t("cacheLocation")}</span>
            <select
              value={cachePolicy.mode}
              onChange={(event) =>
                setCachePolicy({
                  ...cachePolicy,
                  mode: event.target.value as CachePolicy["mode"],
                })
              }
            >
              <option value="persistent">{t("cachePersistent")}</option>
              <option value="session">{t("cacheSession")}</option>
              <option value="off">{t("cacheOff")}</option>
            </select>
          </label>
          <label>
            <span>{t("cacheExpiry")}</span>
            <select
              value={cachePolicy.ttlDays}
              onChange={(event) =>
                setCachePolicy({ ...cachePolicy, ttlDays: Number(event.target.value) })
              }
            >
              <option value={1}>{t("days", "1")}</option>
              <option value={7}>{t("days", "7")}</option>
              <option value={30}>{t("days", "30")}</option>
              <option value={90}>{t("days", "90")}</option>
            </select>
          </label>
          <label>
            <span>{t("maxEntries")}</span>
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
            <span>{t("maxCapacity")}</span>
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
            {t("clearCache")}
          </button>
          <span className="action-spacer" />
          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={() => void saveCachePolicy()}
          >
            {t("saveCache")}
          </button>
        </div>
      </section>

      <section className="settings-card about-card" aria-labelledby="about-title">
        <div className="card-heading">
          <div>
            <div className="section-label">OPEN SOURCE · NO TELEMETRY</div>
            <h2 id="about-title">{t("aboutTitle")}</h2>
          </div>
        </div>
        <p className="cache-intro">{t("aboutText")}</p>
        <div className="about-links">
          <a href={BRANDING.authorUrl} target="_blank" rel="noreferrer">
            {t("authorHomepage")}
          </a>
          <a href={BRANDING.githubUrl} target="_blank" rel="noreferrer">
            {t("projectRepository")}
          </a>
          <a href={BRANDING.supportUrl} target="_blank" rel="noreferrer">
            {t("supportIssues")}
          </a>
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
