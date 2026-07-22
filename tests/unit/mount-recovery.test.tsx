import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_SKINS } from "../../src/skins/builtins";
import { mountFloatRead, unmountFloatRead } from "../../src/content/mount";
import type { PublicBootstrap } from "../../src/shared/types";

const bootstrap: PublicBootstrap = {
  enabled: true,
  defaultMode: "natural_zh",
  clickBehavior: "show_actions",
  activeSkinId: "mochi",
  skin: BUILTIN_SKINS[0]!,
  appearance: {
    companionSize: 72,
    companionOpacity: 1,
    panelWidth: 380,
    panelOpacity: 1,
    fontScale: 1,
    cornerRadius: 16,
    motionEnabled: true,
    motionIntensity: 1,
    snapMargin: 8,
  },
  companionPosition: { edge: "right", yRatio: 0.62 },
  providerConfigured: false,
  locale: "zh_CN",
  pageTranslationEnabled: false,
  translation: { sourceLanguages: ["en"], targetLanguage: "zh-Hans", quality: "smart" },
  ignoredDetectedLanguages: [],
};

afterEach(() => {
  unmountFloatRead();
  document.querySelector("floatread-root")?.remove();
  vi.unstubAllGlobals();
});

describe("mount recovery", () => {
  it("replaces an inert host left behind by an extension reload", async () => {
    const staleHost = document.createElement("floatread-root");
    staleHost.dataset.stale = "true";
    document.documentElement.append(staleHost);
    vi.stubGlobal("__FLOATREAD_SHADOW_MODE__", "open");
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn(async (message: { type: string }) =>
          message.type === "GET_PUBLIC_BOOTSTRAP"
            ? { ok: true, data: bootstrap }
            : { ok: true, data: null },
        ),
        connect: vi.fn(),
      },
    });

    await mountFloatRead();

    const currentHost = document.querySelector<HTMLElement>("floatread-root");
    expect(currentHost).not.toBe(staleHost);
    expect(currentHost?.dataset.stale).toBeUndefined();
    expect(currentHost?.shadowRoot).not.toBeNull();
    expect(document.querySelectorAll("floatread-root")).toHaveLength(1);
  });
});
