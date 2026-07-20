import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { inspectZipCentralDirectory, validateSkinPackage } from "../../src/skins/package-validator";
import { migrateSkinManifest, skinManifestV1Schema } from "../../src/skins/schema";

const VALID_MANIFEST = {
  schemaVersion: 1,
  id: "test-skin",
  name: "Test Skin",
  version: "1.0.0",
  author: "FloatRead Tests",
  description: "A valid test package.",
  license: "MIT",
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
} as const;

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

async function packageWith(
  manifest: unknown = VALID_MANIFEST,
  files: Record<string, Uint8Array | string> = { "assets/idle.png": PNG_SIGNATURE },
): Promise<Uint8Array> {
  const entries: Record<string, Uint8Array> = { "skin.json": strToU8(JSON.stringify(manifest)) };
  for (const [path, value] of Object.entries(files)) {
    entries[path] = typeof value === "string" ? strToU8(value) : value;
  }
  return zipSync(entries, { level: 0 });
}

const dimensions = async (): Promise<{ width: number; height: number }> => ({
  width: 128,
  height: 128,
});

describe("skin package security", () => {
  it("accepts a valid, bounded PNG package", async () => {
    await expect(validateSkinPackage(await packageWith(), dimensions)).resolves.toMatchObject({
      manifest: { id: "test-skin" },
      assets: [{ path: "assets/idle.png", mime: "image/png", width: 128, height: 128 }],
    });
  });

  it.each([
    ["unknown executable field", { ...VALID_MANIFEST, script: "alert(1)" }],
    [
      "illegal color",
      { ...VALID_MANIFEST, panel: { ...VALID_MANIFEST.panel, accent: "url(javascript:bad)" } },
    ],
    [
      "remote URL",
      { ...VALID_MANIFEST, assets: { ...VALID_MANIFEST.assets, idle: "https://bad.test/a.png" } },
    ],
    [
      "path traversal",
      { ...VALID_MANIFEST, assets: { ...VALID_MANIFEST.assets, idle: "../idle.png" } },
    ],
  ])("rejects %s in skin.json", async (_name, manifest) => {
    await expect(
      validateSkinPackage(await packageWith(manifest), dimensions),
    ).rejects.toMatchObject({
      code: "MANIFEST_SCHEMA",
    });
  });

  it.each(["assets/code.js", "assets/view.html", "assets/icon.svg", "assets/font.woff2"])(
    "rejects forbidden file type %s",
    async (path) => {
      await expect(
        validateSkinPackage(await packageWith(VALID_MANIFEST, { [path]: "bad" }), dimensions),
      ).rejects.toMatchObject({ code: "FILE_TYPE", fileName: path });
    },
  );

  it("rejects a forged PNG extension by signature", async () => {
    await expect(
      validateSkinPackage(
        await packageWith(VALID_MANIFEST, {
          "assets/idle.png": new TextEncoder().encode("not png"),
        }),
        dimensions,
      ),
    ).rejects.toMatchObject({ code: "MIME_MISMATCH", fileName: "assets/idle.png" });
  });

  it("rejects invalid decoded dimensions", async () => {
    await expect(
      validateSkinPackage(await packageWith(), async () => ({ width: 8, height: 900 })),
    ).rejects.toMatchObject({ code: "IMAGE_DIMENSIONS" });
  });

  it("rejects a single image over 1.5 MB", async () => {
    const oversized = new Uint8Array(1_500_001);
    oversized.set(PNG_SIGNATURE);
    await expect(
      validateSkinPackage(
        await packageWith(VALID_MANIFEST, { "assets/idle.png": oversized }),
        dimensions,
      ),
    ).rejects.toMatchObject({ code: "IMAGE_TOO_LARGE" });
  });

  it("rejects packages over 5 MB before ZIP parsing", async () => {
    await expect(validateSkinPackage(new Uint8Array(5_000_001), dimensions)).rejects.toMatchObject({
      code: "PACKAGE_TOO_LARGE",
    });
  });

  it("rejects suspicious compression ratios before decompression", () => {
    const bomb = zipSync(
      {
        "skin.json": strToU8(JSON.stringify(VALID_MANIFEST)),
        "assets/idle.png": new Uint8Array(600_000),
      },
      { level: 9 },
    );
    expect(() => inspectZipCentralDirectory(bomb)).toThrowError(
      expect.objectContaining({ code: "ZIP_BOMB", fileName: "assets/idle.png" }),
    );
  });

  it("rejects too many files", async () => {
    const files: Record<string, Uint8Array> = { "assets/idle.png": PNG_SIGNATURE };
    for (let index = 0; index < 12; index += 1) {
      files[`assets/extra-${index}.png`] = PNG_SIGNATURE;
    }
    await expect(
      validateSkinPackage(await packageWith(VALID_MANIFEST, files), dimensions),
    ).rejects.toMatchObject({
      code: "TOO_MANY_FILES",
    });
  });

  it("detects duplicate central-directory names", async () => {
    const original = await packageWith();
    const view = new DataView(original.buffer, original.byteOffset, original.byteLength);
    let eocd = original.length - 22;
    while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd -= 1;
    const centralOffset = view.getUint32(eocd + 16, true);
    const centralSize = view.getUint32(eocd + 12, true);
    const central = original.slice(centralOffset, centralOffset + centralSize);
    const duplicate = new Uint8Array(original.length + centralSize);
    duplicate.set(original.slice(0, eocd), 0);
    duplicate.set(central, eocd);
    duplicate.set(original.slice(eocd), eocd + centralSize);
    const duplicateView = new DataView(duplicate.buffer);
    const newEocd = eocd + centralSize;
    duplicateView.setUint16(newEocd + 8, 4, true);
    duplicateView.setUint16(newEocd + 10, 4, true);
    duplicateView.setUint32(newEocd + 12, centralSize * 2, true);

    expect(() => inspectZipCentralDirectory(duplicate)).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_FILE" }),
    );
  });

  it("migrates the supported V0 panel field names", () => {
    const legacy = {
      ...VALID_MANIFEST,
      schemaVersion: 0,
      panel: {
        ...VALID_MANIFEST.panel,
        backgroundAlt: VALID_MANIFEST.panel.backgroundElevated,
        backgroundElevated: undefined,
        warning: undefined,
      },
    };
    expect(migrateSkinManifest(legacy)).toMatchObject({
      schemaVersion: 1,
      panel: { backgroundElevated: "#18212C", warning: "#FFD166" },
    });
  });

  it("keeps the public schema strict", () => {
    expect(skinManifestV1Schema.safeParse({ ...VALID_MANIFEST, html: "<b>bad</b>" }).success).toBe(
      false,
    );
  });
});
