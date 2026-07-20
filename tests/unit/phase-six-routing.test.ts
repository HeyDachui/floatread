import { afterEach, describe, expect, it, vi } from "vitest";
import { contextMenuMode, createContextMenus } from "../../src/background/context-menu";
import { clearLastResult, copyLastResult, rememberLastResult } from "../../src/content/last-result";
import { createTranslator, resolveUiLocale } from "../../src/i18n/catalog";
import { backgroundToContentSchema, trustedToBackgroundSchema } from "../../src/shared/messages";

describe("Phase 6 command and localization boundaries", () => {
  afterEach(() => {
    clearLastResult();
    vi.unstubAllGlobals();
  });

  it("maps only the three known context-menu children", () => {
    expect(contextMenuMode("floatread-natural-zh")).toBe("natural_zh");
    expect(contextMenuMode("floatread-key-points")).toBe("key_points");
    expect(contextMenuMode("floatread-explain-terms")).toBe("explain_terms");
    expect(contextMenuMode("floatread-selection")).toBeNull();
  });

  it("creates one selection parent and exactly three mode children", async () => {
    const create = vi.fn();
    vi.stubGlobal("chrome", {
      contextMenus: { removeAll: vi.fn(async () => undefined), create },
    });
    await createContextMenus();
    expect(create).toHaveBeenCalledTimes(4);
    expect(create.mock.calls.map(([item]) => item.id)).toEqual([
      "floatread-selection",
      "floatread-natural-zh",
      "floatread-key-points",
      "floatread-explain-terms",
    ]);
  });

  it("copies only the last in-memory result and clears it on pause", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await copyLastResult()).toBe(false);
    rememberLastResult("result only");
    expect(await copyLastResult()).toBe(true);
    expect(writeText).toHaveBeenCalledWith("result only");
    clearLastResult();
    expect(await copyLastResult()).toBe(false);
  });

  it("keeps selected-text actions bounded and credential-free", () => {
    expect(
      backgroundToContentSchema.safeParse({
        type: "RUN_SELECTION",
        mode: "natural_zh",
        text: "Selected text",
      }).success,
    ).toBe(true);
    expect(
      backgroundToContentSchema.safeParse({
        type: "RUN_SELECTION",
        text: "Selected text",
        apiKey: "must-not-cross",
      }).success,
    ).toBe(false);
  });

  it("validates popup mutations as trusted-extension-only messages", () => {
    expect(
      trustedToBackgroundSchema.safeParse({ type: "SET_SITE_PAUSED_CURRENT", paused: true })
        .success,
    ).toBe(true);
    expect(
      trustedToBackgroundSchema.safeParse({
        type: "SET_GLOBAL_ENABLED",
        enabled: true,
        origin: "https://untrusted.example",
      }).success,
    ).toBe(false);
  });

  it("serves matching Chinese and English catalogs with placeholders", () => {
    expect(resolveUiLocale("zh-CN")).toBe("zh_CN");
    expect(resolveUiLocale("en-US")).toBe("en");
    expect(createTranslator("zh_CN")("modeNatural")).toBe("自然中文");
    expect(createTranslator("en")("selectionTooLong", "12001")).toContain("12001");
  });
});
