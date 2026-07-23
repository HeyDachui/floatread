import { injectAndSend, isInjectableUrl } from "./injection";

const CONTENT_SCRIPT_FILE = "content/content-script.js";
const DYNAMIC_SCRIPT_PREFIX = "floatread-site-";

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function persistentSitePattern(value: string | undefined): string | null {
  if (!value || !isInjectableUrl(value)) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback(url.hostname))) {
    return null;
  }
  return `${url.origin}/*`;
}

function declaredContentScriptPatterns(): string[] {
  return (
    chrome.runtime
      .getManifest()
      .content_scripts?.flatMap((contentScript) => contentScript.matches ?? []) ?? []
  ).filter((pattern) => /^https?:\/\//u.test(pattern));
}

function isDeclaredSite(value: string): boolean {
  const url = new URL(value);
  return declaredContentScriptPatterns().some((pattern) => {
    const match = /^https?:\/\/([^/]+)\/\*$/u.exec(pattern);
    return match ? url.hostname === match[1] : false;
  });
}

function hashPattern(pattern: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (const character of pattern) {
    const code = character.codePointAt(0) ?? 0;
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

function scriptId(pattern: string): string {
  return `${DYNAMIC_SCRIPT_PREFIX}${hashPattern(pattern)}`;
}

async function registeredSitePatterns(): Promise<string[]> {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  return scripts
    .filter((script) => script.id.startsWith(DYNAMIC_SCRIPT_PREFIX))
    .flatMap((script) => script.matches ?? []);
}

export async function hasPersistentSiteAccess(value: string | undefined): Promise<boolean> {
  const pattern = persistentSitePattern(value);
  if (!pattern) return false;
  if (isDeclaredSite(value as string)) return true;
  return (await registeredSitePatterns()).includes(pattern);
}

export async function enablePersistentSite(tab: chrome.tabs.Tab): Promise<void> {
  const pattern = persistentSitePattern(tab.url);
  if (!pattern || typeof tab.id !== "number") throw new Error("UNSUPPORTED_PAGE");
  if (!(await chrome.permissions.contains({ origins: [pattern] }))) {
    throw new Error("HOST_PERMISSION_DENIED");
  }

  if (!isDeclaredSite(tab.url as string)) {
    const id = scriptId(pattern);
    const existing = await chrome.scripting.getRegisteredContentScripts();
    if (!existing.some((script) => script.id === id && script.matches?.includes(pattern))) {
      await chrome.scripting.registerContentScripts([
        {
          id,
          matches: [pattern],
          js: [CONTENT_SCRIPT_FILE],
          runAt: "document_idle",
          allFrames: false,
          persistAcrossSessions: true,
        },
      ]);
    }
  }

  await injectAndSend(tab, { type: "SHOW_COMPANION" });
}

export async function persistentContentScriptPatterns(): Promise<string[]> {
  return [...new Set([...declaredContentScriptPatterns(), ...(await registeredSitePatterns())])];
}
