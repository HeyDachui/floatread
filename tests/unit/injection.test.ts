import { afterEach, describe, expect, it, vi } from "vitest";
import { injectAndSend, reconnectDeclaredSiteTabs } from "../../src/background/injection";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("content-script recovery", () => {
  it("uses a healthy existing content script without injecting another copy", async () => {
    const sendMessage = vi.fn(async () => ({ visible: true }));
    const executeScript = vi.fn(async () => []);
    vi.stubGlobal("chrome", {
      tabs: { sendMessage },
      scripting: { executeScript },
    });

    await injectAndSend({ id: 7, url: "https://x.com/home" } as chrome.tabs.Tab, {
      type: "SHOW_COMPANION",
    });

    expect(sendMessage).toHaveBeenCalledOnce();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it("reinjects after a missing or invalidated content-script context", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("Receiving end does not exist"))
      .mockResolvedValueOnce({ visible: true });
    const executeScript = vi.fn(async () => []);
    vi.stubGlobal("chrome", {
      tabs: { sendMessage },
      scripting: { executeScript },
    });

    await injectAndSend({ id: 8, url: "https://x.com/home" } as chrome.tabs.Tab, {
      type: "SHOW_COMPANION",
    });

    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 8 },
      files: ["content/content-script.js"],
    });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("reconnects only stale declared-site tabs after an extension update", async () => {
    const sendMessage = vi.fn(async (tabId: number) => {
      if (tabId === 9) throw new Error("stale context");
      return { visible: true };
    });
    const executeScript = vi.fn(async () => []);
    const query = vi.fn(async () => [
      { id: 9, url: "https://x.com/home" },
      { id: 10, url: "https://twitter.com/home" },
    ]);
    vi.stubGlobal("chrome", {
      tabs: { query, sendMessage },
      scripting: { executeScript, getRegisteredContentScripts: vi.fn(async () => []) },
      runtime: {
        getManifest: () => ({
          content_scripts: [
            { matches: ["https://x.com/*", "https://twitter.com/*", "chrome://settings/*"] },
          ],
        }),
      },
    });

    await reconnectDeclaredSiteTabs();

    expect(query).toHaveBeenCalledWith({
      url: ["https://x.com/*", "https://twitter.com/*"],
    });
    expect(executeScript).toHaveBeenCalledTimes(1);
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 9 },
      files: ["content/content-script.js"],
    });
  });
});
