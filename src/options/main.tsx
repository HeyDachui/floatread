import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { cacheStatusSchema } from "../cache/schemas";
import type { CachePolicy, CacheStats } from "../cache/types";
import { CompanionArtwork } from "../companion/CompanionArtwork";
import { BRANDING } from "../config/branding";
import { createTranslator, resolveUiLocale, type MessageKey } from "../i18n/catalog";
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
import { createCustomPetPackage } from "../pets/custom-pet";
import { preparePetImage, type PreparedPetImage } from "../pets/image-processor";
import { usageSessionSchema, type UsageSession } from "../storage/usage";
import {
  DEFAULT_TRANSLATION_PREFERENCES,
  TRANSLATION_LANGUAGES,
  TRANSLATION_LANGUAGE_KEYS,
  translationPreferencesSchema,
  type TranslationLanguage,
  type TranslationPreferences,
} from "../translation/languages";
import "../companion/styles.css";
import "../shared/page.css";
import "./styles.css";

const PROVIDER_ORDER: ProviderKind[] = [
  "deepseek",
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "openai_compatible",
];

const DEFAULT_CACHE_POLICY: CachePolicy = {
  mode: "persistent",
  ttlDays: 30,
  maxEntries: 20_000,
  maxBytes: 10_000_000,
};

const DEFAULT_APPEARANCE: AppearanceOverrides = {
  companionSize: 76,
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
  const [, setProfiles] = useState<ProviderProfile[]>([]);
  const [draft, setDraft] = useState<ProviderProfile>(() => createProviderProfile("deepseek"));
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [cachePolicy, setCachePolicy] = useState<CachePolicy>(DEFAULT_CACHE_POLICY);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    entries: 0,
    bytes: 0,
    expiredRemoved: 0,
    recentEntries: 0,
    recentBytes: 0,
    longTermEntries: 0,
    longTermBytes: 0,
    reuseHits: 0,
    estimatedTokensSaved: 0,
  });
  const [skins, setSkins] = useState<RuntimeSkinDefinition[]>([]);
  const [activeSkinId, setActiveSkinIdState] = useState("mochi");
  const [previewSkinId, setPreviewSkinId] = useState("mochi");
  const [previewState, setPreviewState] = useState<SkinState>("idle");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>(undefined);
  const [appearance, setAppearance] = useState<AppearanceOverrides>(DEFAULT_APPEARANCE);
  const [reading, setReading] = useState<ReadingPreferences>(DEFAULT_READING);
  const [translation, setTranslation] = useState<TranslationPreferences>(
    DEFAULT_TRANSLATION_PREFERENCES,
  );
  const [usageSessions, setUsageSessions] = useState<UsageSession[]>([]);
  const [petName, setPetName] = useState("");
  const [petTolerance, setPetTolerance] = useState(28);
  const [petSourceFile, setPetSourceFile] = useState<File | null>(null);
  const [preparedPet, setPreparedPet] = useState<PreparedPetImage | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const readingTouched = useRef(false);
  const translationTouched = useRef(false);

  const requiresSecret = PROVIDER_DEFAULTS[draft.kind].requiresSecret;
  const urlValidation = useMemo(() => validateProviderUrl(draft), [draft]);
  const previewSkin = skins.find((skin) => skin.id === previewSkinId) ?? skins[0];
  const activeSkin = skins.find((skin) => skin.id === activeSkinId);
  const optionsLocale = reading.locale === "auto" ? resolveUiLocale() : reading.locale;
  const dateLocale = optionsLocale === "zh_CN" ? "zh-CN" : "en";
  const t = useMemo(() => createTranslator(optionsLocale), [optionsLocale]);
  const providerName = (kind: ProviderKind): string => {
    const names: Record<ProviderKind, [string, string]> = {
      deepseek: ["DeepSeek（推荐）", "DeepSeek (recommended)"],
      openai: ["OpenAI", "OpenAI"],
      anthropic: ["Claude", "Claude"],
      gemini: ["Gemini", "Gemini"],
      ollama: ["Ollama（本机）", "Ollama (local)"],
      openai_compatible: ["自定义 AI 服务", "Custom AI service"],
    };
    return names[kind][optionsLocale === "zh_CN" ? 0 : 1];
  };

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
    if (parsed?.success && !readingTouched.current) setReading(parsed.data);
  };

  const loadTranslationPreferences = async (): Promise<void> => {
    const response = await send({ type: "GET_TRANSLATION_PREFERENCES" });
    const parsed = response.ok ? translationPreferencesSchema.safeParse(response.data) : null;
    if (parsed?.success && !translationTouched.current) setTranslation(parsed.data);
  };

  const loadUsage = async (): Promise<void> => {
    const response = await send({ type: "GET_USAGE_SESSIONS" });
    const parsed = response.ok
      ? usageSessionSchema.array().max(100).safeParse(response.data)
      : null;
    if (parsed?.success) setUsageSessions(parsed.data);
  };

  useEffect(() => {
    let current = true;
    void Promise.all([
      loadProfiles(),
      loadCacheStatus(),
      loadSkins(),
      loadReadingPreferences(),
      loadTranslationPreferences(),
      loadUsage(),
    ]).finally(() => {
      if (current) setHydrated(true);
    });
    return () => {
      current = false;
    };
    // Initial extension-page hydration only; later mutations refresh their own sections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!previewSkin || previewSkin.availableAssets.length === 0) {
      setPreviewImageUrl(undefined);
      return;
    }
    let objectUrl: string | undefined;
    let current = true;
    if (previewSkin.builtinAssetPath) {
      setPreviewImageUrl(chrome.runtime.getURL(previewSkin.builtinAssetPath));
      return () => {
        current = false;
      };
    }
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

  useEffect(
    () => () => {
      if (preparedPet) URL.revokeObjectURL(preparedPet.previewUrl);
    },
    [preparedPet],
  );

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

  const saveTranslationPreferences = async (): Promise<void> => {
    setBusy(true);
    try {
      const response = await send({ type: "UPDATE_TRANSLATION_PREFERENCES", translation });
      setStatus(t(response.ok ? "statusTranslationSaved" : "statusReadingFailed"));
    } finally {
      setBusy(false);
    }
  };

  const clearUsage = async (): Promise<void> => {
    setBusy(true);
    try {
      await send({ type: "CLEAR_USAGE_SESSIONS" });
      await loadUsage();
    } finally {
      setBusy(false);
    }
  };

  const restoreSkinDefaults = async (): Promise<void> => {
    setAppearance(DEFAULT_APPEARANCE);
    await saveAppearance(DEFAULT_APPEARANCE);
    await activateSkin("mochi");
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

  const prepareCustomPet = async (file: File, tolerance = petTolerance): Promise<void> => {
    setBusy(true);
    try {
      const next = await preparePetImage(file, tolerance);
      if (preparedPet) URL.revokeObjectURL(preparedPet.previewUrl);
      setPetSourceFile(file);
      setPreparedPet(next);
      if (!petName) setPetName(file.name.replace(/\.[^.]+$/u, "").slice(0, 80));
      setStatus(t("statusPetPrepared"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("statusUnknownError"));
    } finally {
      setBusy(false);
    }
  };

  const installCustomPet = async (): Promise<void> => {
    if (!preparedPet) return;
    setBusy(true);
    try {
      const pkg = createCustomPetPackage({
        name: petName,
        bytes: preparedPet.bytes,
        width: preparedPet.width,
        height: preparedPet.height,
      });
      await installSkinPackage(pkg);
      await loadSkins();
      await activateSkin(pkg.manifest.id);
      setStatus(t("statusPetInstalled", pkg.manifest.name));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("statusUnknownError"));
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
      setPreviewSkinId("mochi");
      setActiveSkinIdState(activeSkinId === skin.id ? "mochi" : activeSkinId);
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

  const clearSecret = async (): Promise<void> => {
    await send({ type: "CLEAR_PROVIDER_SECRET", profileId: draft.id });
    setSecret("");
    setStatus(t("statusClearedCredential"));
  };

  if (!hydrated) {
    return (
      <main className="options-shell" aria-busy="true">
        <div className="empty-state" role="status">
          {t("popupLoading")}
        </div>
      </main>
    );
  }

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
          <h1>{t("settingsTitle")}</h1>
          <p>{t("settingsIntro")}</p>
        </div>
        <div className="privacy-chip">{t("privacyChip")}</div>
      </header>

      <section className="settings-card provider-simple-card" aria-labelledby="provider-title">
        <div className="card-heading">
          <div>
            <h2 id="provider-title">{t("aiService")}</h2>
            <p>{t("aiServiceIntro")}</p>
          </div>
          <span className="connection-dot" data-ok={testResult?.ok ?? false}>
            {t(testResult?.ok ? "verified" : "unverified")}
          </span>
        </div>

        <div className="form-grid">
          <label>
            <span>{t("aiService")}</span>
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
                  {providerName(kind)}
                </option>
              ))}
            </select>
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

          <details className="wide-field advanced-settings">
            <summary>{t("advancedSettings")}</summary>
            <div className="advanced-grid">
              <label>
                <span>{t("serviceAddress")}</span>
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
                <span>{t("connectionTimeout")}</span>
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
            </div>
          </details>
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
            {t(busy ? "processing" : "saveAndTest")}
          </button>
        </div>
      </section>

      <section
        className="settings-card language-card"
        aria-labelledby="translation-title"
        onChangeCapture={() => {
          translationTouched.current = true;
        }}
      >
        <div className="card-heading">
          <div>
            <h2 id="translation-title">{t("translationLanguagesTitle")}</h2>
            <p>{t("translationLanguagesIntro")}</p>
          </div>
        </div>
        <div className="language-builder">
          <label className="target-language">
            <span>{t("translationQuality")}</span>
            <select
              value={translation.quality}
              onChange={(event) =>
                setTranslation({
                  ...translation,
                  quality: event.target.value as TranslationPreferences["quality"],
                })
              }
            >
              <option value="smart">{t("translationQualitySmart")}</option>
              <option value="fast">{t("translationQualityFast")}</option>
              <option value="precise">{t("translationQualityPrecise")}</option>
            </select>
            <small>{t("translationQualityIntro")}</small>
          </label>
          <fieldset>
            <legend>{t("translateTheseLanguages")}</legend>
            {translation.sourceLanguages.map((language, index) => (
              <div className="language-row" key={`${language}-${index}`}>
                <select
                  aria-label={`${t("translateTheseLanguages")} ${index + 1}`}
                  value={language}
                  onChange={(event) => {
                    const next = [...translation.sourceLanguages];
                    next[index] = event.target.value as TranslationLanguage;
                    if (
                      new Set(next).size !== next.length ||
                      next.includes(translation.targetLanguage)
                    )
                      return;
                    setTranslation({ ...translation, sourceLanguages: next });
                  }}
                >
                  {TRANSLATION_LANGUAGES.filter(
                    (item) =>
                      item === language ||
                      (!translation.sourceLanguages.includes(item) &&
                        item !== translation.targetLanguage),
                  ).map((item) => (
                    <option key={item} value={item}>
                      {t(TRANSLATION_LANGUAGE_KEYS[item] as MessageKey)}
                    </option>
                  ))}
                </select>
                {index === 0 && translation.sourceLanguages.length < 5 ? (
                  <button
                    type="button"
                    className="language-add"
                    aria-label={t("addLanguage")}
                    onClick={() => {
                      const candidate = TRANSLATION_LANGUAGES.find(
                        (item) =>
                          item !== translation.targetLanguage &&
                          !translation.sourceLanguages.includes(item),
                      );
                      if (candidate)
                        setTranslation({
                          ...translation,
                          sourceLanguages: [...translation.sourceLanguages, candidate],
                        });
                    }}
                  >
                    +
                  </button>
                ) : index > 0 ? (
                  <button
                    type="button"
                    className="language-remove"
                    aria-label={t("removeLanguage")}
                    onClick={() =>
                      setTranslation({
                        ...translation,
                        sourceLanguages: translation.sourceLanguages.filter(
                          (_, sourceIndex) => sourceIndex !== index,
                        ),
                      })
                    }
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </fieldset>
          <label className="target-language">
            <span>{t("translateInto")}</span>
            <select
              value={translation.targetLanguage}
              onChange={(event) => {
                const targetLanguage = event.target.value as TranslationLanguage;
                const sourceLanguages = translation.sourceLanguages.filter(
                  (item) => item !== targetLanguage,
                );
                setTranslation({
                  quality: translation.quality,
                  targetLanguage,
                  sourceLanguages:
                    sourceLanguages.length > 0
                      ? sourceLanguages
                      : [targetLanguage === "en" ? "zh-Hans" : "en"],
                });
              }}
            >
              {TRANSLATION_LANGUAGES.map((item) => (
                <option key={item} value={item}>
                  {t(TRANSLATION_LANGUAGE_KEYS[item] as MessageKey)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-actions">
          <span className="action-spacer" />
          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={() => void saveTranslationPreferences()}
          >
            {t("saveTranslationLanguages")}
          </button>
        </div>
      </section>

      <section
        className="settings-card behavior-card"
        aria-labelledby="behavior-title"
        onChangeCapture={() => {
          readingTouched.current = true;
        }}
      >
        <div className="card-heading">
          <div>
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
            <h2 id="skin-title">{t("skinTitle")}</h2>
          </div>
          <span className="privacy-chip">{t("onlyFloatRead")}</span>
        </div>
        <div className="pet-creator">
          <div
            className="pet-drop-zone"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) void prepareCustomPet(file);
            }}
          >
            <strong>{t("customPetTitle")}</strong>
            <p>{t("customPetIntro")}</p>
            <label className="button secondary file-button">
              {t("choosePetImage")}
              <input
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void prepareCustomPet(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {preparedPet ? (
            <div className="pet-preview-editor">
              <div className="pet-preview-field">
                <img src={preparedPet.previewUrl} alt={t("customPetPreview")} />
              </div>
              <div className="pet-editor-controls">
                <label>
                  <span>{t("customPetName")}</span>
                  <input
                    value={petName}
                    maxLength={80}
                    onChange={(event) => setPetName(event.target.value)}
                  />
                </label>
                <label>
                  <span>{t("backgroundRemovalStrength", String(petTolerance))}</span>
                  <input
                    type="range"
                    min="8"
                    max="72"
                    value={petTolerance}
                    onChange={(event) => setPetTolerance(Number(event.target.value))}
                    onPointerUp={() => {
                      if (petSourceFile) void prepareCustomPet(petSourceFile, petTolerance);
                    }}
                    onKeyUp={() => {
                      if (petSourceFile) void prepareCustomPet(petSourceFile, petTolerance);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="button primary"
                  disabled={busy || !petName.trim()}
                  onClick={() => void installCustomPet()}
                >
                  {t("useThisPet")}
                </button>
              </div>
            </div>
          ) : null}
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
                <CompanionArtwork state={previewState} imageUrl={previewImageUrl} />
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
              min={32}
              max={120}
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
              max={760}
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

      <section className="settings-card usage-history-card" aria-labelledby="usage-title">
        <div className="card-heading">
          <div>
            <h2 id="usage-title">{t("usageTitle")}</h2>
            <p>{t("usageIntro")}</p>
          </div>
        </div>
        {usageSessions.length > 0 ? (
          <div className="usage-history">
            {usageSessions.slice(0, 8).map((session) => (
              <article key={session.id} className="usage-session-row">
                <div>
                  <strong>{session.endedAt === null ? t("usageCurrent") : t("usageLast")}</strong>
                  <span>{new Date(session.startedAt).toLocaleString(dateLocale)}</span>
                </div>
                <dl>
                  <div>
                    <dt>{t("usageInput")}</dt>
                    <dd>{session.inputTokens.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>{t("usageOutput")}</dt>
                    <dd>{session.outputTokens.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>{t("usageTotal")}</dt>
                    <dd>{(session.inputTokens + session.outputTokens).toLocaleString()}</dd>
                  </div>
                </dl>
                <small>
                  {t("usageRequests", String(session.requests))} ·{" "}
                  {t("usageCacheHits", String(session.cacheHits))}
                  {!session.usageAvailable ? ` · ${t("usageUnavailable")}` : ""}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">{t("usageEmpty")}</p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button ghost"
            disabled={busy || usageSessions.length === 0}
            onClick={() => void clearUsage()}
          >
            {t("clearUsage")}
          </button>
        </div>
      </section>

      <section className="settings-card cache-card" aria-labelledby="cache-title">
        <div className="card-heading">
          <div>
            <h2 id="cache-title">{t("cacheTitle")}</h2>
          </div>
          <span className="privacy-chip">
            {t("cacheUsage", String(cacheStats.entries), formatBytes(cacheStats.bytes))}
          </span>
        </div>
        <p className="cache-intro">{t("cacheIntro")}</p>
        <div className="usage-summary" aria-label={t("cacheTitle")}>
          <div>
            <span>{t("cacheLongTerm")}</span>
            <strong>
              {t(
                "cacheUsage",
                String(cacheStats.longTermEntries),
                formatBytes(cacheStats.longTermBytes),
              )}
            </strong>
          </div>
          <div>
            <span>{t("cacheRecent")}</span>
            <strong>
              {t(
                "cacheUsage",
                String(cacheStats.recentEntries),
                formatBytes(cacheStats.recentBytes),
              )}
            </strong>
          </div>
          <div>
            <span>{t("cacheReuse")}</span>
            <strong>
              {t(
                "cacheReuseValue",
                String(cacheStats.reuseHits),
                String(cacheStats.estimatedTokensSaved),
              )}
            </strong>
          </div>
        </div>
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
