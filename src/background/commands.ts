import { getActiveTab, injectAndSend } from "./injection";

export function registerCommands(): void {
  chrome.commands.onCommand.addListener((command) => {
    if (command !== "toggle-companion") return;
    void getActiveTab().then(async (tab) => {
      if (tab) await injectAndSend(tab, { type: "TOGGLE_COMPANION" });
    });
  });
}
