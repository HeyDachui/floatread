import { getActiveTab, injectAndSend } from "./injection";

export function registerCommands(): void {
  chrome.commands.onCommand.addListener((command) => {
    void getActiveTab().then(async (tab) => {
      if (!tab) return;
      switch (command) {
        case "toggle-companion":
          await injectAndSend(tab, { type: "TOGGLE_COMPANION" });
          break;
        case "run-default-mode":
          await injectAndSend(tab, { type: "RUN_SELECTION" });
          break;
        case "copy-last-result":
          await injectAndSend(tab, { type: "COPY_LAST_RESULT" });
          break;
      }
    });
  });
}
