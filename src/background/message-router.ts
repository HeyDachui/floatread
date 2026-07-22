import {
  contentToBackgroundSchema,
  trustedToBackgroundSchema,
  type BackgroundResponse,
} from "../shared/messages";
import { getRuntimeSkin, getSkinStateAsset } from "../skins/storage";
import { isSitePaused } from "../storage/site-pauses";
import { getPublicBootstrap, getSettings, updateCompanionPosition } from "../storage/settings";
import {
  getSiteLanguagePreferences,
  isPageTranslationEnabled,
  setPageTranslationEnabled,
  setSiteLanguageDecision,
} from "../storage/page-translation";
import { cancelPageTranslationForTab } from "./page-translation-manager";
import { routeTrustedProviderMessage } from "./provider-controller";

async function routeMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<BackgroundResponse> {
  if (sender.id !== chrome.runtime.id) {
    return { ok: false, error: { code: "INVALID_MESSAGE", message: "Untrusted sender." } };
  }

  const parsed = contentToBackgroundSchema.safeParse(message);
  if (!parsed.success) {
    const trusted = trustedToBackgroundSchema.safeParse(message);
    const extensionOrigin = chrome.runtime.getURL("");
    if (trusted.success && sender.url?.startsWith(extensionOrigin)) {
      return routeTrustedProviderMessage(trusted.data);
    }
    return { ok: false, error: { code: "INVALID_MESSAGE", message: "Invalid message." } };
  }

  switch (parsed.data.type) {
    case "GET_PUBLIC_BOOTSTRAP": {
      const bootstrap = await getPublicBootstrap();
      const siteLanguages = await getSiteLanguagePreferences(sender.tab?.url ?? sender.url);
      const sourceLanguages = [
        ...new Set([
          ...bootstrap.translation.sourceLanguages,
          ...siteLanguages.alwaysTranslate.filter(
            (language) => language !== bootstrap.translation.targetLanguage,
          ),
        ]),
      ].slice(0, 5);
      const effectiveBootstrap = {
        ...bootstrap,
        enabled: bootstrap.enabled && !(await isSitePaused(sender.tab?.url ?? sender.url)),
        pageTranslationEnabled: await isPageTranslationEnabled(sender.tab?.url ?? sender.url),
        translation: { ...bootstrap.translation, sourceLanguages },
        ignoredDetectedLanguages: siteLanguages.ignored,
      };
      return {
        ok: true,
        data: __FLOATREAD_MOCK_PROVIDER__
          ? {
              ...effectiveBootstrap,
              providerConfigured: true,
              providerLabel: "Mock Provider",
            }
          : effectiveBootstrap,
      };
    }
    case "UPDATE_COMPANION_POSITION":
      await updateCompanionPosition(parsed.data.position);
      return { ok: true };
    case "OPEN_OPTIONS":
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    case "GET_ACTIVE_SKIN_ASSET": {
      const settings = await getSettings();
      const skin = await getRuntimeSkin(settings.activeSkinId);
      const asset = await getSkinStateAsset(settings.activeSkinId, parsed.data.state);
      const builtinPath =
        skin.builtinAssets?.[parsed.data.state] ??
        skin.builtinAssets?.idle ??
        skin.builtinAssetPath;
      const builtinResponse = builtinPath ? await fetch(chrome.runtime.getURL(builtinPath)) : null;
      if (!asset && !builtinResponse?.ok) return { ok: true, data: null };
      const mime = asset?.mime ?? "image/webp";
      const bytes = new Uint8Array(
        asset?.bytes ?? (await (builtinResponse as Response).arrayBuffer()),
      );
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32_768) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
      }
      return { ok: true, data: { dataUrl: `data:${mime};base64,${btoa(binary)}` } };
    }
    case "SET_PAGE_TRANSLATION_PREFERENCE":
      await setPageTranslationEnabled(sender.tab?.url ?? sender.url, parsed.data.enabled);
      if (!parsed.data.enabled && typeof sender.tab?.id === "number") {
        cancelPageTranslationForTab(sender.tab.id);
      }
      return { ok: true };
    case "SET_SITE_LANGUAGE_DECISION": {
      const data = await setSiteLanguageDecision(
        sender.tab?.url ?? sender.url,
        parsed.data.language,
        parsed.data.decision,
      );
      return { ok: true, data };
    }
  }
}

export function registerMessageRouter(initialization: Promise<void>): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    void initialization
      .then(() => routeMessage(message, sender))
      .then(sendResponse)
      .catch(() => {
        sendResponse({
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "FloatRead could not complete the request." },
        } satisfies BackgroundResponse);
      });
    return true;
  });
}
