export type MotionPreset = "none" | "breathe" | "float" | "pulse" | "bounce" | "shake" | "spin";
export type SkinState = "idle" | "ready" | "thinking" | "success" | "error";

export interface SkinPanelTokens {
  accent: string;
  background: string;
  backgroundElevated: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  radius: number;
  shadowStrength: number;
}

export interface SkinPackageManifestV1 {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  author: string;
  description?: string | undefined;
  license?: string | undefined;
  assets: {
    idle: string;
    ready?: string | undefined;
    thinking?: string | undefined;
    success?: string | undefined;
    error?: string | undefined;
    preview: string;
  };
  motions: Record<SkinState, MotionPreset>;
  panel: SkinPanelTokens;
}

export interface RuntimeSkinDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  source: "builtin" | "community";
  variant: "native" | "lens" | "glass-orb" | "pixel-bot" | "ink" | "terminal" | "community";
  motions: Record<SkinState, MotionPreset>;
  panel: SkinPanelTokens;
  availableAssets: SkinState[];
}

export interface InstalledSkin {
  manifest: SkinPackageManifestV1;
  installedAt: number;
  totalBytes: number;
}
