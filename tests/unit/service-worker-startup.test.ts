import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reconnectDeclaredSiteTabs: vi.fn(async () => undefined),
}));

vi.mock("../../src/background/injection", () => ({
  reconnectDeclaredSiteTabs: mocks.reconnectDeclaredSiteTabs,
}));
vi.mock("../../src/background/commands", () => ({ registerCommands: vi.fn() }));
vi.mock("../../src/background/message-router", () => ({ registerMessageRouter: vi.fn() }));
vi.mock("../../src/background/request-manager", () => ({ registerGenerationPorts: vi.fn() }));
vi.mock("../../src/background/context-menu", () => ({
  createContextMenus: vi.fn(async () => undefined),
  registerContextMenuClicks: vi.fn(),
}));
vi.mock("../../src/background/page-translation-manager", () => ({
  registerPageTranslationPorts: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  mocks.reconnectDeclaredSiteTabs.mockClear();
});

describe("service worker startup recovery", () => {
  it("probes declared-site tabs on every worker lifetime, without waiting for onInstalled", async () => {
    const setAccessLevel = vi.fn(async () => undefined);
    vi.stubGlobal("chrome", {
      storage: {
        local: { setAccessLevel },
        session: { setAccessLevel },
      },
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onStartup: { addListener: vi.fn() },
        getURL: (path: string) => `chrome-extension://test/${path}`,
      },
      tabs: { create: vi.fn(async () => undefined) },
    });

    await import("../../src/background/service-worker");

    await vi.waitFor(() => expect(mocks.reconnectDeclaredSiteTabs).toHaveBeenCalledOnce());
    expect(setAccessLevel).toHaveBeenCalledTimes(2);
  });
});
