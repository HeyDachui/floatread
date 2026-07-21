import type { ValidatedSkinPackage } from "../skins/package-validator";

export function createCustomPetPackage(input: {
  name: string;
  bytes: Uint8Array;
  width: number;
  height: number;
}): ValidatedSkinPackage {
  const id = `pet-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const path = "pet.webp";
  return {
    manifest: {
      schemaVersion: 1,
      id,
      name: input.name.trim().slice(0, 80) || "我的宠物",
      version: "1.0.0",
      author: "Local user",
      description: "Created locally from one PNG or JPG image.",
      assets: { idle: path, preview: path },
      motions: {
        idle: "breathe",
        ready: "pulse",
        thinking: "float",
        success: "bounce",
        error: "shake",
      },
      panel: {
        accent: "#F29A38",
        background: "#17130FF7",
        backgroundElevated: "#211B14FB",
        text: "#FFF9F0",
        textMuted: "#D8C8B4",
        border: "#FFD7A438",
        success: "#65D58B",
        warning: "#FFD166",
        error: "#FF716F",
        radius: 18,
        shadowStrength: 0.28,
      },
    },
    assets: [
      {
        path,
        mime: "image/webp",
        bytes: input.bytes,
        width: input.width,
        height: input.height,
      },
    ],
    totalBytes: input.bytes.byteLength,
  };
}
