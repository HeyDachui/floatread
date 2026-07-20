import {
  contentToBackgroundSchema,
  trustedToBackgroundSchema,
  type BackgroundResponse,
} from "../shared/messages";
import { getPublicBootstrap, updateCompanionPosition } from "../storage/settings";
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
    case "GET_PUBLIC_BOOTSTRAP":
      return {
        ok: true,
        data: __FLOATREAD_MOCK_PROVIDER__
          ? {
              ...(await getPublicBootstrap()),
              providerConfigured: true,
              providerLabel: "Mock Provider",
            }
          : await getPublicBootstrap(),
      };
    case "UPDATE_COMPANION_POSITION":
      await updateCompanionPosition(parsed.data.position);
      return { ok: true };
    case "OPEN_OPTIONS":
      await chrome.runtime.openOptionsPage();
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
