import { cacheRecordSchema, createCacheRecord } from "./record";
import type { CacheRecord, ResultCache } from "./types";

const SESSION_CACHE_KEY = "resultCacheSessionV1";

async function readRecords(): Promise<CacheRecord[]> {
  const stored = await chrome.storage.session.get(SESSION_CACHE_KEY);
  const raw = stored[SESSION_CACHE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((record) => {
    const parsed = cacheRecordSchema.safeParse(record);
    return parsed.success ? [parsed.data] : [];
  });
}

async function writeRecords(records: CacheRecord[]): Promise<void> {
  await chrome.storage.session.set({ [SESSION_CACHE_KEY]: records });
}

export const sessionCache: ResultCache = {
  async get(key, now = Date.now()) {
    const records = await readRecords();
    const record = records.find((item) => item.key === key);
    if (!record || record.expiresAt <= now) {
      if (record) await writeRecords(records.filter((item) => item.key !== key));
      return undefined;
    }
    const updated = { ...record, lastAccessedAt: now };
    await writeRecords(records.map((item) => (item.key === key ? updated : item)));
    return updated;
  },
  async put(key, output, policy, now = Date.now()) {
    if (!output || policy.mode === "off") return;
    const next = createCacheRecord(key, output, policy, now);
    if (next.byteSize > policy.maxBytes) return;
    const records = (await readRecords())
      .filter((record) => record.key !== key && record.expiresAt > now)
      .concat(next)
      .sort((left, right) => right.lastAccessedAt - left.lastAccessedAt);
    const kept: CacheRecord[] = [];
    let bytes = 0;
    for (const record of records) {
      if (kept.length >= policy.maxEntries || bytes + record.byteSize > policy.maxBytes) continue;
      kept.push(record);
      bytes += record.byteSize;
    }
    await writeRecords(kept);
  },
  async clear() {
    await chrome.storage.session.remove(SESSION_CACHE_KEY);
  },
  async stats(now = Date.now()) {
    const records = await readRecords();
    const valid = records.filter((record) => record.expiresAt > now);
    if (valid.length !== records.length) await writeRecords(valid);
    return {
      entries: valid.length,
      bytes: valid.reduce((sum, record) => sum + record.byteSize, 0),
      expiredRemoved: records.length - valid.length,
    };
  },
};
