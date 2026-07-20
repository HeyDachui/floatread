import { strToU8, zipSync } from "fflate";
import { getBuiltinSkin } from "./builtins";
import { getAllSkinAssets, getInstalledSkinManifest } from "./storage";
import type { RuntimeSkinDefinition, SkinPackageManifestV1 } from "./types";

async function renderBuiltinPreview(skin: RuntimeSkinDefinition): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法创建皮肤预览。");
  context.clearRect(0, 0, 160, 160);
  const gradient = context.createRadialGradient(58, 48, 6, 80, 82, 66);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.16, skin.panel.accent);
  gradient.addColorStop(1, skin.panel.backgroundElevated.slice(0, 7));
  context.fillStyle = gradient;
  if (skin.variant === "pixel-bot" || skin.variant === "terminal") {
    context.fillRect(30, 30, 100, 100);
  } else {
    context.beginPath();
    context.arc(80, 80, 54, 0, Math.PI * 2);
    context.fill();
  }
  context.strokeStyle = skin.panel.accent;
  context.lineWidth = 4;
  context.strokeRect(48, 70, 64, 28);
  context.fillStyle = skin.panel.text;
  context.fillRect(60, 80, 8, 8);
  context.fillRect(92, 80, 8, 8);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("PNG export failed"))),
      "image/png",
    ),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

function builtinManifest(skin: RuntimeSkinDefinition): SkinPackageManifestV1 {
  return {
    schemaVersion: 1,
    id: `${skin.id}-export`,
    name: `${skin.name} Export`,
    version: "1.0.0",
    author: "FloatRead",
    description: "Exported from a bundled FloatRead skin and its current design tokens.",
    license: "MIT",
    assets: { idle: "assets/idle.png", preview: "preview.png" },
    motions: skin.motions,
    panel: skin.panel,
  };
}

export async function exportSkinPackage(id: string): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  const builtin = getBuiltinSkin(id);
  if (builtin) {
    const preview = await renderBuiltinPreview(builtin);
    files["skin.json"] = strToU8(JSON.stringify(builtinManifest(builtin), null, 2));
    files["assets/idle.png"] = preview;
    files["preview.png"] = preview;
  } else {
    const manifest = await getInstalledSkinManifest(id);
    if (!manifest) throw new Error("找不到要导出的皮肤。");
    files["skin.json"] = strToU8(JSON.stringify(manifest, null, 2));
    for (const asset of await getAllSkinAssets(id)) {
      files[asset.path] = new Uint8Array(asset.bytes);
    }
  }
  const archive = zipSync(files, { level: 6 });
  return new Blob([new Uint8Array(archive).buffer], { type: "application/zip" });
}
