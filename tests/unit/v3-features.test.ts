import { afterEach, describe, expect, it, vi } from "vitest";
import { createCustomPetPackage } from "../../src/pets/custom-pet";
import { findOpaqueBounds, removeConnectedLightBackground } from "../../src/pets/image-processor";
import { skinManifestV1Schema } from "../../src/skins/schema";
import {
  addUsage,
  endUsageSession,
  listUsageSessions,
  startUsageSession,
} from "../../src/storage/usage";
import { detectTextLanguage, translationPreferencesSchema } from "../../src/translation/languages";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("multilingual translation preferences", () => {
  it("detects configured language families without sending text anywhere", () => {
    expect(detectTextLanguage("Les utilisateurs et les modèles sont avec nous.")).toBe("fr");
    expect(detectTextLanguage("これは日本語の文章です。")).toBe("ja");
    expect(detectTextLanguage("Settings", "en-US")).toBe("en");
  });

  it("accepts unique source languages and rejects translating a language into itself", () => {
    expect(
      translationPreferencesSchema.safeParse({
        sourceLanguages: ["en", "ja", "fr"],
        targetLanguage: "zh-Hans",
      }).success,
    ).toBe(true);
    expect(
      translationPreferencesSchema.safeParse({
        sourceLanguages: ["en", "ja"],
        targetLanguage: "en",
      }).success,
    ).toBe(false);
  });
});

describe("local translation usage", () => {
  it("serializes concurrent token updates and closes one start-to-stop session", async () => {
    const values: Record<string, unknown> = {};
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: values[key] })),
          set: vi.fn(async (items: Record<string, unknown>) => Object.assign(values, items)),
          remove: vi.fn(async (key: string) => delete values[key]),
        },
      },
    });
    const id = "661ab919-67d4-4c7d-903b-989fd36b1c20";
    await startUsageSession({
      id,
      provider: "DeepSeek",
      model: "deepseek-chat",
      sourceLanguages: ["en", "ja"],
      targetLanguage: "zh-Hans",
    });
    await Promise.all([
      addUsage(id, { requests: 1, inputTokens: 120, outputTokens: 35 }),
      addUsage(id, { requests: 1, inputTokens: 80, outputTokens: 20, cacheHits: 2 }),
    ]);
    await endUsageSession(id, "stopped");
    await expect(listUsageSessions()).resolves.toEqual([
      expect.objectContaining({
        id,
        requests: 2,
        cacheHits: 2,
        inputTokens: 200,
        outputTokens: 55,
        endReason: "stopped",
      }),
    ]);
  });
});

describe("custom pet preparation", () => {
  it("removes only border-connected light pixels and preserves enclosed white detail", () => {
    const width = 5;
    const height = 5;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) {
        if (x === 2 && y === 2) continue;
        const offset = (y * width + x) * 4;
        pixels[offset] = 20;
        pixels[offset + 1] = 20;
        pixels[offset + 2] = 20;
      }
    }
    const processed = removeConnectedLightBackground(pixels, width, height, 28);
    expect(processed[3]).toBe(0);
    expect(processed[(2 * width + 2) * 4 + 3]).toBe(255);
    expect(findOpaqueBounds(processed, width, height)).toEqual({
      left: 1,
      top: 1,
      right: 3,
      bottom: 3,
    });
  });

  it("creates a code-free, versioned local pet skin", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "661ab919-67d4-4c7d-903b-989fd36b1c20",
    });
    const created = createCustomPetPackage({
      name: "小猫",
      bytes: new Uint8Array([1, 2, 3]),
      width: 256,
      height: 320,
    });
    expect(skinManifestV1Schema.safeParse(created.manifest).success).toBe(true);
    expect(created.manifest.assets).toEqual({ idle: "pet.webp", preview: "pet.webp" });
    expect(created.manifest).not.toHaveProperty("script");
    expect(Object.values(created.manifest.assets).join(" ")).not.toMatch(
      /javascript:|https?:\/\//iu,
    );
  });
});
