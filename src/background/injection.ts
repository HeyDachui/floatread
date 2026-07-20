import type { BackgroundToContentMessage } from "../shared/messages";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

export function isInjectableUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ALLOWED_SCHEMES.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

export async function injectAndSend(
  tab: chrome.tabs.Tab,
  message: BackgroundToContentMessage,
): Promise<void> {
  if (typeof tab.id !== "number" || !isInjectableUrl(tab.url)) {
    throw new Error("UNSUPPORTED_PAGE");
  }
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content/content-script.js"],
  });
  await chrome.tabs.sendMessage(tab.id, message);
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
