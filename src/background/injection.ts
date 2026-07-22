import type { BackgroundToContentMessage } from "../shared/messages";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const DECLARED_SITE_PATTERNS = ["https://x.com/*", "https://twitter.com/*"];
const injectionByTab = new Map<number, Promise<void>>();

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
  try {
    await chrome.tabs.sendMessage(tab.id, message);
    return;
  } catch {
    await ensureContentScript(tab);
  }
  await chrome.tabs.sendMessage(tab.id, message);
}

export async function ensureContentScript(tab: chrome.tabs.Tab): Promise<void> {
  if (typeof tab.id !== "number" || !isInjectableUrl(tab.url)) {
    throw new Error("UNSUPPORTED_PAGE");
  }
  const tabId = tab.id;
  const existing = injectionByTab.get(tabId);
  if (existing) return existing;
  const injection = chrome.scripting
    .executeScript({
      target: { tabId },
      files: ["content/content-script.js"],
    })
    .then(() => undefined)
    .finally(() => injectionByTab.delete(tabId));
  injectionByTab.set(tabId, injection);
  return injection;
}

export async function reconnectDeclaredSiteTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: DECLARED_SITE_PATTERNS });
  await Promise.allSettled(
    tabs.map(async (tab) => {
      if (typeof tab.id !== "number") return;
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "GET_COMPANION_STATUS" });
      } catch {
        await ensureContentScript(tab);
      }
    }),
  );
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
