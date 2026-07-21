import {
  contentToBackgroundSchema,
  trustedToBackgroundSchema,
  type BackgroundResponse,
} from "../shared/messages";
import { getSkinStateAsset } from "../skins/storage";
import { isSitePaused } from "../storage/site-pauses";
import { getPublicBootstrap, getSettings, updateCompanionPosition } from "../storage/settings";
import { isPageTranslationEnabled, setPageTranslationEnabled } from "../storage/page-translation";
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
      const effectiveBootstrap = {
        ...bootstrap,
        enabled: bootstrap.enabled && !(await isSitePaused(sender.tab?.url ?? sender.url)),
        pageTranslationEnabled: await isPageTranslationEnabled(sender.tab?.url ?? sender.url),
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
      const asset = await getSkinStateAsset(settings.activeSkinId, parsed.data.state);
      if (!asset) return { ok: true, data: null };
      const bytes = new Uint8Array(asset.bytes);
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32_768) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
      }
      return { ok: true, data: { dataUrl: `data:${asset.mime};base64,${btoa(binary)}` } };
    }
    case "SET_PAGE_TRANSLATION_PREFERENCE":
      await setPageTranslationEnabled(sender.tab?.url ?? sender.url, parsed.data.enabled);
      if (!parsed.data.enabled && typeof sender.tab?.id === "number") {
        cancelPageTranslationForTab(sender.tab.id);
      }
      return { ok: true };
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
