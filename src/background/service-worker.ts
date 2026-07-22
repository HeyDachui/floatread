import { registerCommands } from "./commands";
import { registerMessageRouter } from "./message-router";
import { registerGenerationPorts } from "./request-manager";
import { createContextMenus, registerContextMenuClicks } from "./context-menu";
import { registerPageTranslationPorts } from "./page-translation-manager";
import { reconnectDeclaredSiteTabs } from "./injection";

const initializeTrustedStorage = async (): Promise<void> => {
  await Promise.all([
    chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }),
    chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }),
  ]);
};

const initialization = initializeTrustedStorage();

registerMessageRouter(initialization);
registerCommands();
registerContextMenuClicks();
registerGenerationPorts();
registerPageTranslationPorts();

// A manual unpacked-extension reload starts a fresh Service Worker but does
// not reliably emit onInstalled. Probe open declared-site tabs on every worker
// lifetime so an invalidated Content Script is replaced before the user clicks.
void initialization.then(reconnectDeclaredSiteTabs).catch(() => undefined);

chrome.runtime.onInstalled.addListener((details) => {
  void initialization.then(async () => {
    if (details.reason === "install") {
      await createContextMenus();
      await reconnectDeclaredSiteTabs();
      await chrome.tabs.create({ url: chrome.runtime.getURL("src/options/onboarding/index.html") });
    } else if (details.reason === "update") {
      await createContextMenus();
      await reconnectDeclaredSiteTabs();
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  void initialization;
});
