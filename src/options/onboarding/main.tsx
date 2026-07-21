import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CompanionArtwork } from "../../companion/CompanionArtwork";
import { createTranslator, resolveUiLocale } from "../../i18n/catalog";
import {
  createProviderProfile,
  PROVIDER_DEFAULTS,
  validateProviderUrl,
} from "../../providers/config";
import { connectionTestResultSchema } from "../../providers/schemas";
import type { ProviderKind, ProviderProfile, SecretStorageMode } from "../../providers/types";
import type { BackgroundResponse } from "../../shared/messages";
import { runtimeSkinSchema } from "../../skins/schema";
import type { RuntimeSkinDefinition } from "../../skins/types";
import { BRANDING } from "../../config/branding";
import "../../companion/styles.css";
import "../../shared/page.css";
import "./styles.css";

const PROVIDERS: ProviderKind[] = [
  "deepseek",
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "openai_compatible",
];

async function send(message: unknown): Promise<BackgroundResponse> {
  return (await chrome.runtime.sendMessage(message)) as BackgroundResponse;
}

function updateProfile(profile: ProviderProfile, patch: Partial<ProviderProfile>): ProviderProfile {
  return { ...profile, ...patch, updatedAt: Date.now() };
}

export function OnboardingApp(): React.JSX.Element {
  const locale = resolveUiLocale();
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(() => createProviderProfile("deepseek"));
  const [secret, setSecret] = useState("");
  const [skins, setSkins] = useState<RuntimeSkinDefinition[]>([]);
  const [selectedSkin, setSelectedSkin] = useState("mochi");
  const [demoResult, setDemoResult] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const urlValidation = useMemo(() => validateProviderUrl(profile), [profile]);
  const skin = skins.find((item) => item.id === selectedSkin) ?? skins[0];
  const providerName = (kind: ProviderKind): string => {
    const names: Record<ProviderKind, [string, string]> = {
      deepseek: ["DeepSeek（推荐）", "DeepSeek (recommended)"],
      openai: ["OpenAI", "OpenAI"],
      anthropic: ["Claude", "Claude"],
      gemini: ["Gemini", "Gemini"],
      ollama: ["Ollama（本机）", "Ollama (local)"],
      openai_compatible: ["自定义 AI 服务", "Custom AI service"],
    };
    return names[kind][locale === "zh_CN" ? 0 : 1];
  };

  useEffect(() => {
    void send({ type: "LIST_RUNTIME_SKINS" }).then((response) => {
      const parsed = response.ok ? runtimeSkinSchema.array().safeParse(response.data) : null;
      if (parsed?.success) setSkins(parsed.data.filter((item) => item.source === "builtin"));
    });
  }, []);

  const saveProvider = async (testConnection: boolean): Promise<boolean> => {
    if (
      !urlValidation.valid ||
      (PROVIDER_DEFAULTS[profile.kind].requiresSecret && !secret.trim())
    ) {
      setStatus(t("onboardingSaveError"));
      return false;
    }
    setBusy(true);
    try {
      if (testConnection) {
        const granted = await chrome.permissions.request({ origins: [urlValidation.permission] });
        if (!granted) {
          setStatus(t("onboardingSaveError"));
          return false;
        }
      }
      const saved = await send({
        type: "SAVE_PROVIDER_PROFILE",
        profile,
        ...(secret.trim() ? { secret } : {}),
      });
      if (!saved.ok) throw new Error("save failed");
      await send({ type: "ACTIVATE_PROVIDER_PROFILE", profileId: profile.id });
      if (testConnection) {
        setStatus(t("onboardingTesting"));
        const result = await send({ type: "TEST_PROVIDER_CONNECTION", profileId: profile.id });
        const parsed = result.ok ? connectionTestResultSchema.safeParse(result.data) : null;
        if (!parsed?.success || !parsed.data.ok) {
          setStatus(
            parsed?.success
              ? (parsed.data.error?.message ?? t("onboardingSaveError"))
              : t("onboardingSaveError"),
          );
          return false;
        }
        setStatus(t("onboardingTestOk"));
      } else {
        setStatus(t("onboardingSaved"));
      }
      setSecret("");
      return true;
    } catch {
      setStatus(t("onboardingSaveError"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const applySkin = async (skinId: string): Promise<void> => {
    setSelectedSkin(skinId);
    await send({ type: "ACTIVATE_SKIN", skinId });
  };

  const finish = async (): Promise<void> => {
    await chrome.storage.local.set({ onboardingCompletedV1: true });
    await chrome.runtime.openOptionsPage();
    window.close();
  };

  return (
    <main className="onboarding-shell">
      <div className="onboarding-progress" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((item) => (
          <span key={item} data-active={item <= step} />
        ))}
      </div>

      {step === 0 ? (
        <section className="welcome-step">
          <div className="welcome-orb" aria-hidden="true">
            F
          </div>
          <div className="eyebrow">{t("onboardingKicker")}</div>
          <h1>{t("onboardingTitle")}</h1>
          <p>{t("onboardingPrivacy")}</p>
          <div className="boundary-grid">
            <article>
              <strong>01</strong>
              <span>{locale === "zh_CN" ? "主动" : "YOU START"}</span>
              <p>
                {locale === "zh_CN"
                  ? "不启动，就不会发送网页文字。"
                  : "No page text is sent until you start."}
              </p>
            </article>
            <article>
              <strong>02</strong>
              <span>{locale === "zh_CN" ? "直连" : "DIRECT"}</span>
              <p>
                {locale === "zh_CN"
                  ? "浏览器直接连接你的 AI 服务。"
                  : "Your browser connects directly to your AI service."}
              </p>
            </article>
            <article>
              <strong>03</strong>
              <span>{locale === "zh_CN" ? "本地" : "LOCAL"}</span>
              <p>
                {locale === "zh_CN"
                  ? "设置、用量和皮肤保存在本机。"
                  : "Settings, usage and skins stay on this device."}
              </p>
            </article>
          </div>
          <button type="button" className="primary-action" onClick={() => setStep(1)}>
            {t("onboardingStart")}
          </button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="setup-step" aria-labelledby="provider-heading">
          <div className="eyebrow">
            {locale === "zh_CN" ? "第 2 步 · AI 服务" : "STEP 02 · AI SERVICE"}
          </div>
          <h1 id="provider-heading">{t("onboardingProviderTitle")}</h1>
          <p>{t("onboardingProviderHint")}</p>
          <div className="onboarding-form">
            <label>
              <span>{t("providerType")}</span>
              <select
                value={profile.kind}
                onChange={(event) => {
                  const kind = event.target.value as ProviderKind;
                  const defaults = PROVIDER_DEFAULTS[kind];
                  setProfile(
                    updateProfile(profile, {
                      kind,
                      displayName: defaults.displayName,
                      baseUrl: defaults.baseUrl,
                      model: defaults.modelExample,
                    }),
                  );
                }}
              >
                {PROVIDERS.map((kind) => (
                  <option key={kind} value={kind}>
                    {providerName(kind)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("modelName")}</span>
              <input
                value={profile.model}
                onChange={(event) =>
                  setProfile(updateProfile(profile, { model: event.target.value }))
                }
              />
            </label>
            {profile.kind === "openai_compatible" ? (
              <details className="wide">
                <summary>{t("advancedSettings")}</summary>
                <label>
                  <span>{t("serviceAddress")}</span>
                  <input
                    value={profile.baseUrl}
                    spellCheck={false}
                    onChange={(event) =>
                      setProfile(updateProfile(profile, { baseUrl: event.target.value }))
                    }
                  />
                </label>
              </details>
            ) : null}
            {PROVIDER_DEFAULTS[profile.kind].requiresSecret ? (
              <label className="wide">
                <span>{t("apiKey")}</span>
                <input
                  type="password"
                  value={secret}
                  autoComplete="new-password"
                  placeholder="sk-example-not-a-real-key"
                  onChange={(event) => setSecret(event.target.value)}
                />
              </label>
            ) : null}
            <fieldset className="wide storage-choice">
              <legend>{t("onboardingSecretMode")}</legend>
              {(
                [
                  ["session", t("onboardingSession")],
                  ["local", t("onboardingLocal")],
                  ["prompt_each_time", t("onboardingPrompt")],
                ] as Array<[SecretStorageMode, string]>
              ).map(([mode, label]) => (
                <label key={mode}>
                  <input
                    type="radio"
                    name="secret-mode"
                    checked={profile.secretStorageMode === mode}
                    onChange={() => setProfile(updateProfile(profile, { secretStorageMode: mode }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            {profile.secretStorageMode === "local" ? (
              <p className="wide risk-note">{t("localRisk")}</p>
            ) : null}
          </div>
          <div className="onboarding-status" role="status" aria-live="polite">
            {status}
          </div>
          <div className="step-actions">
            <button type="button" className="text-action" onClick={() => setStep(0)}>
              {t("back")}
            </button>
            <button type="button" className="text-action" onClick={() => setStep(2)}>
              {t("onboardingSkip")}
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={busy}
              onClick={() => void saveProvider(false)}
            >
              {t("onboardingSave")}
            </button>
            <button
              type="button"
              className="primary-action"
              disabled={busy}
              onClick={() => void saveProvider(true).then((ok) => ok && setStep(2))}
            >
              {t("onboardingAuthorizeTest")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="setup-step" aria-labelledby="skin-heading">
          <div className="eyebrow">
            {locale === "zh_CN" ? "第 3 步 · 角色" : "STEP 03 · CHARACTER"}
          </div>
          <h1 id="skin-heading">{t("onboardingSkinTitle")}</h1>
          <div className="onboarding-skin-grid">
            <div className="skin-list">
              {skins.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selectedSkin === item.id}
                  onClick={() => void applySkin(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            {skin ? (
              <div
                className="demo-stage fr-companion-layer"
                data-skin={skin.variant}
                style={
                  {
                    "--fr-accent": skin.panel.accent,
                    "--fr-bg": skin.panel.background,
                    "--fr-bg-elevated": skin.panel.backgroundElevated,
                    "--fr-text": skin.panel.text,
                    "--fr-text-muted": skin.panel.textMuted,
                    "--fr-border": skin.panel.border,
                    "--fr-success": skin.panel.success,
                    "--fr-error": skin.panel.error,
                    "--fr-companion-size": "72px",
                    "--fr-companion-opacity": 1,
                  } as React.CSSProperties
                }
              >
                <div className="fr-companion fr-state-ready" data-motion="none">
                  <CompanionArtwork
                    state="ready"
                    imageUrl={
                      skin?.builtinAssetPath
                        ? chrome.runtime.getURL(skin.builtinAssetPath)
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="local-demo">
            <span>{t("onboardingDemoText")}</span>
            <button type="button" onClick={() => setDemoResult(t("onboardingDemoResult"))}>
              {t("onboardingDemoAction")}
            </button>
            {demoResult ? <strong role="status">{demoResult}</strong> : null}
            <small>{t("onboardingDemoPrivacy")}</small>
          </div>
          <div className="step-actions">
            <button type="button" className="text-action" onClick={() => setStep(1)}>
              {t("back")}
            </button>
            <span className="spacer" />
            <button
              type="button"
              className="secondary-action"
              onClick={() => void chrome.tabs.create({ url: "https://x.com/" })}
            >
              {t("onboardingOpenX")}
            </button>
            <button type="button" className="primary-action" onClick={() => void finish()}>
              {t("onboardingFinish")}
            </button>
          </div>
          <a className="source-link" href={BRANDING.githubUrl} target="_blank" rel="noreferrer">
            {BRANDING.githubUrl}
          </a>
        </section>
      ) : null}
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <OnboardingApp />
    </StrictMode>,
  );
}
