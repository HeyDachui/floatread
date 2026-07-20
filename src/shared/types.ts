export type ReaderMode = "natural_zh" | "key_points" | "explain_terms";
export type ClickBehavior = "show_actions" | "run_default_mode";
export type CompanionEdge = "left" | "right";

export interface CompanionPosition {
  edge: CompanionEdge;
  yRatio: number;
}

export interface AppearanceOverrides {
  companionSize: number;
  companionOpacity: number;
  panelWidth: number;
  panelOpacity: number;
  fontScale: number;
  cornerRadius: number;
  motionEnabled: boolean;
  motionIntensity: 0 | 1 | 2;
  snapMargin: number;
}

export interface PublicBootstrap {
  enabled: boolean;
  defaultMode: ReaderMode;
  clickBehavior: ClickBehavior;
  activeSkinId: string;
  skin: RuntimeSkinDefinition;
  appearance: AppearanceOverrides;
  companionPosition: CompanionPosition;
  providerConfigured: boolean;
  providerLabel?: string | undefined;
}
import type { RuntimeSkinDefinition } from "../skins/types";
