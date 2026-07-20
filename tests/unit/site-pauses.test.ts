import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPausedOrigins,
  isSitePaused,
  pageOrigin,
  setSitePaused,
} from "../../src/storage/site-pauses";

function installStorage(initial: unknown = []): { values: Record<string, unknown> } {
  const values: Record<string, unknown> = { pausedOriginsV1: initial };
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: values[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => Object.assign(values, items)),
      },
    },
  });
  return { values };
}

afterEach(() => vi.unstubAllGlobals());

describe("site pause storage", () => {
  it("normalizes HTTP(S) pages to their origin", () => {
    expect(pageOrigin("https://example.com/path?q=1")).toBe("https://example.com");
    expect(pageOrigin("chrome://extensions")).toBeNull();
    expect(pageOrigin("not a url")).toBeNull();
  });

  it("adds and removes one origin without storing paths", async () => {
    installStorage();
    await expect(setSitePaused("https://example.com/a", true)).resolves.toBe("https://example.com");
    await expect(isSitePaused("https://example.com/other")).resolves.toBe(true);
    await expect(getPausedOrigins()).resolves.toEqual(["https://example.com"]);
    await setSitePaused("https://example.com/b", false);
    await expect(isSitePaused("https://example.com/")).resolves.toBe(false);
  });

  it("recovers from corrupted storage and rejects unsupported schemes", async () => {
    installStorage({ bad: true });
    await expect(getPausedOrigins()).resolves.toEqual([]);
    await expect(setSitePaused("file:///tmp/source", true)).rejects.toThrow("UNSUPPORTED_PAGE");
  });
});
