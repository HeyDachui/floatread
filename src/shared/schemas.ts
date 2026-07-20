import { z } from "zod";
import { runtimeSkinSchema } from "../skins/schema";

export const readerModeSchema = z.enum(["natural_zh", "key_points", "explain_terms"]);
export const clickBehaviorSchema = z.enum(["show_actions", "run_default_mode"]);
export const companionPositionSchema = z
  .object({
    edge: z.enum(["left", "right"]),
    yRatio: z.number().min(0).max(1),
  })
  .strict();

export const cachePolicySchema = z
  .object({
    mode: z.enum(["persistent", "session", "off"]),
    ttlDays: z.number().int().min(1).max(90),
    maxEntries: z.number().int().min(1).max(2_000),
    maxBytes: z.number().int().min(1_000_000).max(100_000_000),
  })
  .strict();

export const appearanceOverridesSchema = z
  .object({
    companionSize: z.number().min(40).max(96),
    companionOpacity: z.number().min(0.35).max(1),
    panelWidth: z.number().min(320).max(520),
    panelOpacity: z.number().min(0.72).max(1),
    fontScale: z.number().min(0.85).max(1.25),
    cornerRadius: z.number().min(8).max(24),
    motionEnabled: z.boolean(),
    motionIntensity: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    snapMargin: z.number().min(8).max(24),
  })
  .strict();

export const publicBootstrapSchema = z
  .object({
    enabled: z.boolean(),
    defaultMode: readerModeSchema,
    clickBehavior: clickBehaviorSchema,
    activeSkinId: z.string().min(1),
    skin: runtimeSkinSchema,
    appearance: appearanceOverridesSchema,
    companionPosition: companionPositionSchema,
    providerConfigured: z.boolean(),
    providerLabel: z.string().min(1).optional(),
  })
  .strict();
