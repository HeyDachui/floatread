import type { RuntimeSkinDefinition, SkinPanelTokens } from "./types";

const DEFAULT_MOTIONS: RuntimeSkinDefinition["motions"] = {
  idle: "breathe",
  ready: "pulse",
  thinking: "spin",
  success: "bounce",
  error: "shake",
};

const basePanel: SkinPanelTokens = {
  accent: "#4F8CFF",
  background: "#11151DF5",
  backgroundElevated: "#1B212CFB",
  text: "#F7F9FC",
  textMuted: "#AEB8C8",
  border: "#FFFFFF21",
  success: "#64D98B",
  warning: "#FFD166",
  error: "#FF6B73",
  radius: 16,
  shadowStrength: 0.3,
};

function builtin(
  id: string,
  name: string,
  variant: RuntimeSkinDefinition["variant"],
  panel: Partial<SkinPanelTokens>,
): RuntimeSkinDefinition {
  return {
    schemaVersion: 1,
    id,
    name,
    source: "builtin",
    variant,
    motions: DEFAULT_MOTIONS,
    panel: { ...basePanel, ...panel },
    availableAssets: [],
  };
}

export const BUILTIN_SKINS: RuntimeSkinDefinition[] = [
  builtin("native", "Native", "native", { accent: "#4F8CFF" }),
  builtin("lens", "Lens", "lens", { accent: "#FFB44A", background: "#17130FF7" }),
  builtin("glass-orb", "Glass Orb", "glass-orb", {
    accent: "#77D8FF",
    background: "#101A24E8",
    border: "#BDEBFF42",
  }),
  builtin("pixel-bot", "Pixel Bot", "pixel-bot", {
    accent: "#9CF574",
    background: "#11190FFF",
    radius: 10,
  }),
  builtin("ink", "Ink", "ink", {
    accent: "#E8E8E8",
    background: "#101010FA",
    backgroundElevated: "#181818FF",
    textMuted: "#B8B8B8",
    border: "#FFFFFF33",
  }),
  builtin("terminal", "Terminal", "terminal", {
    accent: "#49F59AFF",
    background: "#07110BFA",
    backgroundElevated: "#0A1B10FF",
    text: "#D9FFE9FF",
    textMuted: "#77B991FF",
    border: "#49F59A42",
    radius: 8,
  }),
];

export function getBuiltinSkin(id: string): RuntimeSkinDefinition | undefined {
  return BUILTIN_SKINS.find((skin) => skin.id === id);
}
