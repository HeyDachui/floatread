import { z } from "zod";
import { translationLanguageSchema, type TranslationLanguage } from "../translation/languages";

const ENABLED_ORIGINS_KEY = "pageTranslationEnabledOriginsV1";
const MEMORY_KEY = "pageTranslationMemoryV1";
const SITE_LANGUAGE_KEY = "pageTranslationSiteLanguagesV1";
const MEMORY_LIMIT = 2_000;

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

async function readMemory(): Promise<MemoryRecord[]> {
  const stored = await chrome.storage.local.get(MEMORY_KEY);
  const parsed = z.array(memoryRecordSchema).max(MEMORY_LIMIT).safeParse(stored[MEMORY_KEY]);
  if (parsed.success) return parsed.data;
  if (stored[MEMORY_KEY] !== undefined) await chrome.storage.local.remove(MEMORY_KEY);
  return [];
}

export async function getPageTranslationMemory(keys: string[]): Promise<Map<string, string>> {
  const wanted = new Set(keys);
  return new Map(
    (await readMemory())
      .filter((record) => wanted.has(record.key))
      .map((record) => [record.key, record.translation]),
  );
}

export async function putPageTranslationMemory(
  values: Array<{ key: string; translation: string }>,
): Promise<void> {
  if (values.length === 0) return;
  const byKey = new Map((await readMemory()).map((record) => [record.key, record]));
  const now = Date.now();
  for (const value of values) {
    const parsed = memoryRecordSchema.safeParse({ ...value, updatedAt: now });
    if (parsed.success) byKey.set(parsed.data.key, parsed.data);
  }
  const retained = [...byKey.values()]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MEMORY_LIMIT);
  await chrome.storage.local.set({ [MEMORY_KEY]: retained });
}
