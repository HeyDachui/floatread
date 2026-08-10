import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enablePersistentSite,
  hasPersistentSiteAccess,
  persistentSitePattern,
} from "../../src/background/site-access";

afterEach(() => {
  vi.unstubAllGlobals();
});

function manifest(): chrome.runtime.Manifest {
  return {
    manifest_version: 3,
    name: "FloatRead",
    version: "0.5.0",
    content_scripts: [
      {
        matches: ["https://x.com/*", "https://twitter.com/*"],
        js: ["content/content-script.js"],
      },
    ],
  };
}

describe("persistent per-site access", () => {
  it("creates only exact HTTPS-origin patterns", () => {
    expect(persistentSitePattern("https://www.ted.com/talks/example")).toBe(
      "https://www.ted.com/*",
    );
    expect(persistentSitePattern("http://example.com/")).toBeNull();
    expect(persistentSitePattern("chrome://extensions/")).toBeNull();
  });

  it("treats X as already enabled and TED as disabled before registration", async () => {
    vi.stubGlobal("chrome", {
      runtime: { getManifest: manifest },
      scripting: { getRegisteredContentScripts: vi.fn(async () => []) },
    });

    await expect(hasPersistentSiteAccess("https://x.com/home")).resolves.toBe(true);
    await expect(hasPersistentSiteAccess("https://www.ted.com/talks/example")).resolves.toBe(false);
  });

  it("registers an exact TED content script and immediately injects the current tab", async () => {
    const registerContentScripts = vi.fn(async () => undefined);
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("Receiving end does not exist"))
      .mockResolvedValueOnce({ visible: true });
    const executeScript = vi.fn(async () => []);
    vi.stubGlobal("chrome", {
      runtime: { getManifest: manifest },
      permissions: { contains: vi.fn(async () => true) },
      tabs: { sendMessage },
      scripting: {
        getRegisteredContentScripts: vi.fn(async () => []),
        registerContentScripts,
        executeScript,
      },
    });

    await enablePersistentSite({
      id: 42,
      url: "https://www.ted.com/talks/example",
    } as chrome.tabs.Tab);

    expect(registerContentScripts).toHaveBeenCalledWith([
      expect.objectContaining({
        matches: ["https://www.ted.com/*"],
        js: ["content/content-script.js"],
        persistAcrossSessions: true,
      }),
    ]);
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 42 },
      files: ["content/content-script.js"],
    });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("does not register or inject without the exact host permission", async () => {
    const registerContentScripts = vi.fn();
    const executeScript = vi.fn();
    vi.stubGlobal("chrome", {
      runtime: { getManifest: manifest },
      permissions: { contains: vi.fn(async () => false) },
      tabs: { sendMessage: vi.fn() },
      scripting: {
        getRegisteredContentScripts: vi.fn(async () => []),
        registerContentScripts,
        executeScript,
      },
    });

    await expect(
      enablePersistentSite({
        id: 43,
        url: "https://www.ted.com/talks/example",
      } as chrome.tabs.Tab),
    ).rejects.toThrow("HOST_PERMISSION_DENIED");
    expect(registerContentScripts).not.toHaveBeenCalled();
    expect(executeScript).not.toHaveBeenCalled();
  });
});
