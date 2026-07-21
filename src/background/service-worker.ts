import { registerCommands } from "./commands";
import { registerMessageRouter } from "./message-router";
import { registerGenerationPorts } from "./request-manager";
import { createContextMenus, registerContextMenuClicks } from "./context-menu";
import { registerPageTranslationPorts } from "./page-translation-manager";

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

chrome.runtime.onInstalled.addListener((details) => {
  void initialization.then(async () => {
    if (details.reason === "install") {
      await createContextMenus();
      await chrome.tabs.create({ url: chrome.runtime.getURL("src/options/onboarding/index.html") });
    } else if (details.reason === "update") {
      await createContextMenus();
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  void initialization;
});
