import { z } from "zod";
import {
  appearanceOverridesSchema,
  cachePolicySchema,
  clickBehaviorSchema,
  companionPositionSchema,
  readerModeSchema,
} from "../shared/schemas";
import type { AppearanceOverrides, CompanionPosition, PublicBootstrap } from "../shared/types";
import { getRuntimeSkin } from "../skins/storage";

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
    cache: cachePolicySchema,
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

const legacySettingsV0Schema = z
  .object({
    schemaVersion: z.literal(0),
    enabled: z.boolean().optional(),
    defaultMode: readerModeSchema.optional(),
    clickBehavior: clickBehaviorSchema.optional(),
    activeSkinId: z.string().min(1).optional(),
    companionPosition: companionPositionSchema.optional(),
    locale: z.enum(["auto", "zh_CN", "en"]).optional(),
  })
  .passthrough();

export function migrateAppSettings(raw: unknown): AppSettings | null {
  const current = appSettingsSchema.safeParse(raw);
  if (current.success) return current.data;
  const legacy = legacySettingsV0Schema.safeParse(raw);
  if (!legacy.success) return null;
  return {
    ...DEFAULT_SETTINGS,
    enabled: legacy.data.enabled ?? DEFAULT_SETTINGS.enabled,
    defaultMode: legacy.data.defaultMode ?? DEFAULT_SETTINGS.defaultMode,
    clickBehavior: legacy.data.clickBehavior ?? DEFAULT_SETTINGS.clickBehavior,
    activeSkinId: legacy.data.activeSkinId ?? DEFAULT_SETTINGS.activeSkinId,
    companionPosition: legacy.data.companionPosition ?? DEFAULT_SETTINGS.companionPosition,
    locale: legacy.data.locale ?? DEFAULT_SETTINGS.locale,
  };
}

export async function getSettings(): Promise<AppSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const raw = stored[SETTINGS_KEY];
  const current = appSettingsSchema.safeParse(raw);
  if (current.success) return current.data;
  const migrated = migrateAppSettings(raw);
  if (migrated) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: migrated });
    return migrated;
  }
  await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  return DEFAULT_SETTINGS;
}

export async function updateCachePolicy(cache: AppSettings["cache"]): Promise<void> {
  const parsed = cachePolicySchema.parse(cache);
  const settings = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...settings, cache: parsed } });
}

export async function updateAppearance(appearance: AppearanceOverrides): Promise<void> {
  const parsed = appearanceOverridesSchema.parse(appearance);
  const settings = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...settings, appearance: parsed } });
}

export async function updateReadingPreferences(
  preferences: Pick<AppSettings, "defaultMode" | "clickBehavior" | "locale">,
): Promise<void> {
  const settings = await getSettings();
  const next = appSettingsSchema.parse({ ...settings, ...preferences });
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
}

export async function restoreDefaultSettings(): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
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

export async function setActiveSkinId(activeSkinId: string): Promise<void> {
  const settings = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...settings, activeSkinId } });
}

export async function getPublicBootstrap(): Promise<PublicBootstrap> {
  const settings = await getSettings();
  const locale =
    settings.locale === "auto"
      ? chrome.i18n.getUILanguage().toLowerCase().startsWith("zh")
        ? "zh_CN"
        : "en"
      : settings.locale;
  return {
    enabled: settings.enabled,
    defaultMode: settings.defaultMode,
    clickBehavior: settings.clickBehavior,
    activeSkinId: settings.activeSkinId,
    skin: await getRuntimeSkin(settings.activeSkinId),
    appearance: settings.appearance,
    companionPosition: settings.companionPosition,
    providerConfigured: settings.activeProviderId !== null,
    locale,
    pageTranslationEnabled: false,
  };
}
