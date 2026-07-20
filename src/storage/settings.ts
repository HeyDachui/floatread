import { z } from "zod";
import {
  appearanceOverridesSchema,
  clickBehaviorSchema,
  companionPositionSchema,
  readerModeSchema,
} from "../shared/schemas";
import type { CompanionPosition, PublicBootstrap } from "../shared/types";

const SETTINGS_KEY = "appSettings";

export const appSettingsSchema = z
  .object({
    schemaVersion: z.literal(1),
    enabled: z.boolean(),
    defaultMode: readerModeSchema,
    clickBehavior: clickBehaviorSchema,
    activeProviderId: z.string().min(1).nullable(),
    activeSkinId: z.string().min(1),
    appearance: appearanceOverridesSchema,
    cache: z
      .object({
        mode: z.enum(["persistent", "session", "off"]),
        ttlDays: z.number().int().min(1).max(90),
        maxEntries: z.number().int().min(1).max(2_000),
        maxBytes: z.number().int().min(1_000_000).max(100_000_000),
      })
      .strict(),
    companionPosition: companionPositionSchema,
    locale: z.enum(["auto", "zh_CN", "en"]),
  })
  .strict();

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  enabled: true,
  defaultMode: "natural_zh",
  clickBehavior: "show_actions",
  activeProviderId: null,
  activeSkinId: "native",
  appearance: {
    companionSize: 58,
    companionOpacity: 0.9,
    panelWidth: 380,
    panelOpacity: 0.96,
    fontScale: 1,
    cornerRadius: 16,
    motionEnabled: true,
    motionIntensity: 1,
    snapMargin: 12,
  },
  cache: {
    mode: "persistent",
    ttlDays: 7,
    maxEntries: 200,
    maxBytes: 10_000_000,
  },
  companionPosition: {
    edge: "right",
    yRatio: 0.62,
  },
  locale: "auto",
};

export async function getSettings(): Promise<AppSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const parsed = appSettingsSchema.safeParse(stored[SETTINGS_KEY]);
  if (parsed.success) {
    return parsed.data;
  }
  await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  return DEFAULT_SETTINGS;
}

export async function updateCompanionPosition(position: CompanionPosition): Promise<void> {
  const settings = await getSettings();
  await chrome.storage.local.set({
    [SETTINGS_KEY]: {
      ...settings,
      companionPosition: position,
    },
  });
}

export async function setGlobalEnabled(enabled: boolean): Promise<void> {
  const settings = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...settings, enabled } });
}

export async function setActiveProviderId(activeProviderId: string | null): Promise<void> {
  const settings = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...settings, activeProviderId } });
}

export async function getPublicBootstrap(): Promise<PublicBootstrap> {
  const settings = await getSettings();
  return {
    enabled: settings.enabled,
    defaultMode: settings.defaultMode,
    clickBehavior: settings.clickBehavior,
    activeSkinId: settings.activeSkinId,
    appearance: settings.appearance,
    companionPosition: settings.companionPosition,
    providerConfigured: settings.activeProviderId !== null,
  };
}
