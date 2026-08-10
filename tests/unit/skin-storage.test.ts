import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_SKINS } from "../../src/skins/builtins";
import {
  deleteInstalledSkin,
  getSkinStateAsset,
  installSkinPackage,
  listRuntimeSkins,
} from "../../src/skins/storage";
import type { SkinPackageManifestV1 } from "../../src/skins/types";
import type { ValidatedSkinPackage } from "../../src/skins/package-validator";

function manifest(id: string): SkinPackageManifestV1 {
  return {
    schemaVersion: 1,
    id,
    name: `Skin ${id}`,
    version: "1.0.0",
    author: "FloatRead Tests",
    assets: { idle: "assets/idle.png", preview: "assets/idle.png" },
    motions: {
      idle: "breathe",
      ready: "pulse",
      thinking: "spin",
      success: "bounce",
      error: "shake",
    },
    panel: {
      accent: "#77D8FF",
      background: "#10151C",
      backgroundElevated: "#18212C",
      text: "#F3FBFF",
      textMuted: "#92AABB",
      border: "#294052",
      success: "#72E6A5",
      warning: "#FFD166",
      error: "#FF747D",
      radius: 14,
      shadowStrength: 0.28,
    },
  };
}

function packageFor(id: string): ValidatedSkinPackage {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  return {
    manifest: manifest(id),
    assets: [{ path: "assets/idle.png", mime: "image/png", bytes, width: 64, height: 64 }],
    totalBytes: bytes.byteLength + 500,
  };
}

function installStorage(initial: unknown[] = []): void {
  const values: Record<string, unknown> = { installedSkinsV1: initial };
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: values[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => Object.assign(values, items)),
      },
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("skin storage separation", () => {
  it("ships three original pets and five authored state frames for the new companions", () => {
    const pets = BUILTIN_SKINS.filter((skin) => skin.variant === "pet");
    expect(pets.map((skin) => skin.id)).toEqual(["mochi", "maple", "piko"]);
    for (const skin of pets.filter((item) => item.id !== "mochi")) {
      expect(skin.availableAssets).toEqual(["idle", "ready", "thinking", "success", "error"]);
      expect(Object.keys(skin.builtinAssets ?? {})).toHaveLength(5);
    }
  });

  it("lists six built-ins, installs binary assets separately, and deletes them", async () => {
    installStorage();
    const id = "storage-proof-skin";
    await installSkinPackage(packageFor(id));

    const runtime = await listRuntimeSkins();
    expect(runtime.slice(0, BUILTIN_SKINS.length)).toEqual(BUILTIN_SKINS);
    expect(runtime).toContainEqual(expect.objectContaining({ id, source: "community" }));
    await expect(getSkinStateAsset(id, "error")).resolves.toMatchObject({
      skinId: id,
      path: "assets/idle.png",
      mime: "image/png",
    });

    await deleteInstalledSkin(id);
    await expect(getSkinStateAsset(id, "idle")).resolves.toBeUndefined();
  });

  it("rejects community metadata beyond the 25 MB capacity before writing assets", async () => {
    installStorage(
      Array.from({ length: 5 }, (_, index) => ({
        manifest: manifest(`capacity-${index}`),
        installedAt: index,
        totalBytes: 5_000_000,
      })),
    );
    await expect(installSkinPackage(packageFor("capacity-overflow"))).rejects.toThrow(
      "社区皮肤总容量不能超过 25 MB。",
    );
  });
});
