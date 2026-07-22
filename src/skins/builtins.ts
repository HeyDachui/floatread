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
  options: {
    assetPath?: string;
    assetPaths?: RuntimeSkinDefinition["builtinAssets"];
    motions?: RuntimeSkinDefinition["motions"];
  } = {},
): RuntimeSkinDefinition {
  const assetStates = options.assetPaths
    ? (Object.keys(options.assetPaths) as Array<keyof typeof options.assetPaths>)
    : options.assetPath
      ? (["idle", "ready", "thinking", "success", "error"] as const)
      : [];
  return {
    schemaVersion: 1,
    id,
    name,
    source: "builtin",
    variant,
    motions: options.motions ?? DEFAULT_MOTIONS,
    panel: { ...basePanel, ...panel },
    availableAssets: [...assetStates],
    ...(options.assetPath ? { builtinAssetPath: options.assetPath } : {}),
    ...(options.assetPaths ? { builtinAssets: options.assetPaths } : {}),
  };
}

function authoredPetAssets(pet: string): NonNullable<RuntimeSkinDefinition["builtinAssets"]> {
  return {
    idle: `pets/${pet}/idle.webp`,
    ready: `pets/${pet}/ready.webp`,
    thinking: `pets/${pet}/thinking.webp`,
    success: `pets/${pet}/success.webp`,
    error: `pets/${pet}/error.webp`,
  };
}

export const BUILTIN_SKINS: RuntimeSkinDefinition[] = [
  builtin(
    "mochi",
    "Mochi",
    "pet",
    { accent: "#F39A52", background: "#17130FF7", border: "#F5C58A42" },
    {
      assetPath: "pets/mochi/mochi.webp",
      motions: {
        idle: "breathe",
        ready: "pulse",
        thinking: "float",
        success: "bounce",
        error: "shake",
      },
    },
  ),
  builtin(
    "maple",
    "Maple 红熊猫",
    "pet",
    { accent: "#D96A32", background: "#19110DF7", border: "#F0A27045" },
    {
      assetPaths: authoredPetAssets("maple"),
      motions: {
        idle: "breathe",
        ready: "pulse",
        thinking: "float",
        success: "bounce",
        error: "shake",
      },
    },
  ),
  builtin(
    "piko",
    "Piko 小企鹅",
    "pet",
    { accent: "#68CDB6", background: "#10191AF7", border: "#8BE4D045" },
    {
      assetPaths: authoredPetAssets("piko"),
      motions: {
        idle: "breathe",
        ready: "pulse",
        thinking: "float",
        success: "bounce",
        error: "shake",
      },
    },
  ),
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
