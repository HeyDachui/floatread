import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_SKINS } from "../../src/skins/builtins";
import { OnboardingApp } from "../../src/options/onboarding/main";
import { PopupApp } from "../../src/popup/main";

const native = BUILTIN_SKINS[0]!;

function installChrome(siteAccess = true): {
  sendMessage: ReturnType<typeof vi.fn>;
  requestPermission: ReturnType<typeof vi.fn>;
} {
  const popupState = {
    globalEnabled: true,
    supportedPage: true,
    siteAccess,
    currentOrigin: "https://example.com",
    sitePaused: false,
    companionVisible: true,
    pageTranslation: { enabled: false, active: false, status: "idle", translatedCount: 0 },
    provider: { configured: false },
    skin: { id: native.id, name: native.name, panel: native.panel },
    usage: null,
  };
  const sendMessage = vi.fn(async (message: { type: string }) => {
    if (message.type === "LIST_RUNTIME_SKINS") return { ok: true, data: BUILTIN_SKINS };
    if (message.type === "ENABLE_CURRENT_SITE") popupState.siteAccess = true;
    return { ok: true, data: popupState };
  });
  const requestPermission = vi.fn(async () => true);
  vi.stubGlobal("chrome", {
    i18n: { getUILanguage: () => "en-US" },
    runtime: {
      sendMessage,
      openOptionsPage: vi.fn(async () => undefined),
      getURL: (path: string) => `chrome-extension://test/${path}`,
    },
    tabs: { create: vi.fn(async () => undefined) },
    permissions: { request: requestPermission },
    storage: { local: { set: vi.fn(async () => undefined) } },
  });
  return { sendMessage, requestPermission };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Phase 6 extension pages", () => {
  it("renders the popup state and routes the global pause switch", async () => {
    const chromeMock = installChrome();
    const user = userEvent.setup();
    render(<PopupApp />);

    expect(await screen.findByText("Available on this site")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "FloatRead is enabled" }));
    await waitFor(() =>
      expect(chromeMock.sendMessage).toHaveBeenCalledWith({
        type: "SET_GLOBAL_ENABLED",
        enabled: false,
      }),
    );
  });

  it("requests exact-origin access before enabling FloatRead on a non-X site", async () => {
    const chromeMock = installChrome(false);
    const user = userEvent.setup();
    render(<PopupApp />);

    await user.click(await screen.findByRole("button", { name: "Enable on this site" }));
    expect(chromeMock.requestPermission).toHaveBeenCalledWith({
      origins: ["https://example.com/*"],
    });
    await waitFor(() =>
      expect(chromeMock.sendMessage).toHaveBeenCalledWith({ type: "ENABLE_CURRENT_SITE" }),
    );
    expect(await screen.findByText("Available on this site")).toBeVisible();
  });

  it("walks a fresh user through the local no-Provider demo", async () => {
    installChrome();
    const user = userEvent.setup();
    render(<OnboardingApp />);

    await user.click(screen.getByRole("button", { name: "Start setup" }));
    await user.click(screen.getByRole("button", { name: "Configure later" }));
    expect(await screen.findByRole("heading", { name: "Choose a character" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Run local demo" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "我们已重置受影响的 Codex 用户的使用限额。",
    );
  });
});
