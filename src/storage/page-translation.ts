import { z } from "zod";

const ENABLED_ORIGINS_KEY = "pageTranslationEnabledOriginsV1";
const MEMORY_KEY = "pageTranslationMemoryV1";
const MEMORY_LIMIT = 2_000;

const memoryRecordSchema = z
  .object({
    key: z.string().regex(/^[a-f0-9]{64}$/u),
    translation: z.string().min(1).max(8_000),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

type MemoryRecord = z.infer<typeof memoryRecordSchema>;

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
