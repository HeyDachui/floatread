import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, getSettings, migrateAppSettings } from "../../src/storage/settings";

function installStorage(initial: unknown): {
  values: Record<string, unknown>;
  set: ReturnType<typeof vi.fn>;
} {
  const values: Record<string, unknown> = { appSettings: initial };
  const set = vi.fn(async (items: Record<string, unknown>) => Object.assign(values, items));
  const local = {
    get: vi.fn(async (key: string) => ({ [key]: values[key] })),
    set,
  } as unknown as chrome.storage.StorageArea;
  vi.stubGlobal("chrome", { storage: { local } });
  return { values, set };
}

afterEach(() => vi.unstubAllGlobals());

describe("settings migrations", () => {
  it("migrates known V0 fields and supplies new safe defaults", () => {
    expect(
      migrateAppSettings({
        schemaVersion: 0,
        enabled: false,
        defaultMode: "key_points",
        unknownLegacyField: "ignored",
      }),
    ).toMatchObject({
      schemaVersion: 3,
      enabled: false,
      defaultMode: "key_points",
      cache: DEFAULT_SETTINGS.cache,
    });
  });

  it("preserves the old page behavior as precise when migrating V2 settings", () => {
    expect(
      migrateAppSettings({
        ...DEFAULT_SETTINGS,
        schemaVersion: 2,
        translation: { sourceLanguages: ["en"], targetLanguage: "zh-Hans" },
      }),
    ).toMatchObject({
      schemaVersion: 3,
      translation: { quality: "precise" },
    });
  });

  it("recovers from corrupted settings without blocking startup", async () => {
    const storage = installStorage({ schemaVersion: 1, enabled: "not-a-boolean" });
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    expect(storage.set).toHaveBeenCalled();
    expect(storage.values.appSettings).toEqual(DEFAULT_SETTINGS);
  });

  it("does not accept unknown future schema versions", () => {
    expect(migrateAppSettings({ schemaVersion: 999, enabled: true })).toBeNull();
  });
});
