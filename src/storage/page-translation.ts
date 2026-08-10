import { z } from "zod";
import { getAutomaticMemory, putAutomaticMemory } from "../cache/service";
import type { CachePolicy } from "../cache/types";
import { translationLanguageSchema, type TranslationLanguage } from "../translation/languages";

const ENABLED_ORIGINS_KEY = "pageTranslationEnabledOriginsV1";
const MEMORY_KEY = "pageTranslationMemoryV1";
const SITE_LANGUAGE_KEY = "pageTranslationSiteLanguagesV1";
const MEMORY_LIMIT = 2_000;
const DEFAULT_MEMORY_POLICY: CachePolicy = {
  mode: "persistent",
  ttlDays: 30,
  maxEntries: 20_000,
  maxBytes: 10_000_000,
};

const memoryRecordSchema = z
  .object({
    key: z.string().regex(/^[a-f0-9]{64}$/u),
    translation: z.string().min(1).max(16_000),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

type MemoryRecord = z.infer<typeof memoryRecordSchema>;

const siteLanguageRecordSchema = z
  .object({
    origin: z.string().url().max(2_048),
    alwaysTranslate: z.array(translationLanguageSchema).max(5),
    ignored: z.array(translationLanguageSchema).max(12),
  })
  .strict();

const siteLanguageRecordsSchema = z.array(siteLanguageRecordSchema).max(500);

export interface SiteLanguagePreferences {
  alwaysTranslate: TranslationLanguage[];
  ignored: TranslationLanguage[];
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

async function enabledOrigins(): Promise<string[]> {
  const stored = await chrome.storage.local.get(ENABLED_ORIGINS_KEY);
  const parsed = z.array(z.string().url()).max(500).safeParse(stored[ENABLED_ORIGINS_KEY]);
  return parsed.success ? parsed.data : [];
}

async function siteLanguageRecords(): Promise<z.infer<typeof siteLanguageRecordSchema>[]> {
  const stored = await chrome.storage.local.get(SITE_LANGUAGE_KEY);
  const parsed = siteLanguageRecordsSchema.safeParse(stored[SITE_LANGUAGE_KEY]);
  if (parsed.success) return parsed.data;
  if (stored[SITE_LANGUAGE_KEY] !== undefined) await chrome.storage.local.remove(SITE_LANGUAGE_KEY);
  return [];
}

export async function getSiteLanguagePreferences(
  url: string | undefined,
): Promise<SiteLanguagePreferences> {
  const origin = originOf(url);
  if (!origin) return { alwaysTranslate: [], ignored: [] };
  const record = (await siteLanguageRecords()).find((item) => item.origin === origin);
  return record
    ? { alwaysTranslate: [...record.alwaysTranslate], ignored: [...record.ignored] }
    : { alwaysTranslate: [], ignored: [] };
}

export async function setSiteLanguageDecision(
  url: string | undefined,
  language: TranslationLanguage,
  decision: "always" | "ignore",
): Promise<SiteLanguagePreferences> {
  const origin = originOf(url);
  if (!origin) return { alwaysTranslate: [], ignored: [] };
  const records = await siteLanguageRecords();
  const existing = records.find((item) => item.origin === origin);
  const alwaysTranslate = new Set(existing?.alwaysTranslate ?? []);
  const ignored = new Set(existing?.ignored ?? []);
  if (decision === "always") {
    ignored.delete(language);
    if (alwaysTranslate.size < 5) alwaysTranslate.add(language);
  } else {
    alwaysTranslate.delete(language);
    ignored.add(language);
  }
  const next = siteLanguageRecordSchema.parse({
    origin,
    alwaysTranslate: [...alwaysTranslate],
    ignored: [...ignored],
  });
  await chrome.storage.local.set({
    [SITE_LANGUAGE_KEY]: [next, ...records.filter((item) => item.origin !== origin)].slice(0, 500),
  });
  return { alwaysTranslate: next.alwaysTranslate, ignored: next.ignored };
}

export async function isPageTranslationEnabled(url: string | undefined): Promise<boolean> {
  const origin = originOf(url);
  return origin !== null && (await enabledOrigins()).includes(origin);
}

export async function setPageTranslationEnabled(
  url: string | undefined,
  enabled: boolean,
): Promise<void> {
  const origin = originOf(url);
  if (!origin) return;
  const current = new Set(await enabledOrigins());
  if (enabled) current.add(origin);
  else current.delete(origin);
  await chrome.storage.local.set({ [ENABLED_ORIGINS_KEY]: [...current].sort() });
}

async function readLegacyMemory(): Promise<MemoryRecord[]> {
  const stored = await chrome.storage.local.get(MEMORY_KEY);
  const parsed = z.array(memoryRecordSchema).max(MEMORY_LIMIT).safeParse(stored[MEMORY_KEY]);
  if (parsed.success) return parsed.data;
  if (stored[MEMORY_KEY] !== undefined) await chrome.storage.local.remove(MEMORY_KEY);
  return [];
}

async function migrateLegacyMemory(
  keys: string[],
  policy: CachePolicy,
): Promise<Map<string, string>> {
  if (policy.mode !== "persistent" || keys.length === 0) return new Map();
  const legacy = await readLegacyMemory();
  if (legacy.length === 0) return new Map();
  const wanted = new Set(keys);
  const matches = legacy.filter((record) => wanted.has(record.key));
  if (matches.length === 0) return new Map();
  const migrated = await putAutomaticMemory(
    matches.map((record) => ({
      key: record.key,
      output: record.translation,
      options: { namespace: "page_translation", promotable: true },
    })),
    policy,
  );
  if (migrated) {
    const migratedKeys = new Set(matches.map((record) => record.key));
    const remaining = legacy.filter((record) => !migratedKeys.has(record.key));
    if (remaining.length > 0) await chrome.storage.local.set({ [MEMORY_KEY]: remaining });
    else await chrome.storage.local.remove(MEMORY_KEY);
  }
  return new Map(matches.map((record) => [record.key, record.translation]));
}

export async function getPageTranslationMemory(
  keys: string[],
  policy: CachePolicy = DEFAULT_MEMORY_POLICY,
): Promise<Map<string, string>> {
  try {
    const records = await getAutomaticMemory(keys, policy);
    const translated = new Map([...records].map(([key, record]) => [key, record.output]));
    const missing = keys.filter((key) => !translated.has(key));
    for (const [key, output] of await migrateLegacyMemory(missing, policy)) {
      translated.set(key, output);
    }
    return translated;
  } catch {
    return new Map();
  }
}

export async function putPageTranslationMemory(
  values: Array<{
    key: string;
    translation: string;
    sourceLength?: number;
    kind?: "content" | "ui";
  }>,
  policy: CachePolicy = DEFAULT_MEMORY_POLICY,
): Promise<void> {
  if (values.length === 0) return;
  await putAutomaticMemory(
    values.map((value) => ({
      key: value.key,
      output: value.translation,
      options: {
        namespace: "page_translation",
        promotable: value.kind === "ui" || (value.sourceLength ?? Number.MAX_SAFE_INTEGER) <= 240,
        estimatedTokens:
          Math.ceil((value.sourceLength ?? 0) / 4) + Math.ceil(value.translation.length / 2),
      },
    })),
    policy,
  );
}

export async function clearLegacyPageTranslationMemory(): Promise<void> {
  await chrome.storage.local.remove(MEMORY_KEY);
}
