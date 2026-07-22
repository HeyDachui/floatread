import { createCacheRecord, parseCacheRecord } from "./record";
import type { CachePolicy, CachePutOptions, CacheRecord, ResultCache } from "./types";

const SESSION_CACHE_KEY = "resultCacheSessionV1";

async function readRecords(): Promise<CacheRecord[]> {
  const stored = await chrome.storage.session.get(SESSION_CACHE_KEY);
  const raw = stored[SESSION_CACHE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((record) => {
    const parsed = parseCacheRecord(record);
    return parsed ? [parsed] : [];
  });
}

async function writeRecords(records: CacheRecord[]): Promise<void> {
  await chrome.storage.session.set({ [SESSION_CACHE_KEY]: records });
}

function retainWithinPolicy(records: CacheRecord[], policy: CachePolicy): CacheRecord[] {
  const byKey = new Map(records.map((record) => [record.key, record]));
  let bytes = records.reduce((sum, record) => sum + record.byteSize, 0);
  const recentBytes = records
    .filter((record) => record.tier === "recent")
    .reduce((sum, record) => sum + record.byteSize, 0);
  const longTermBytes = bytes - recentBytes;
  const halfBudget = Math.floor(policy.maxBytes / 2);
  const preferredTier =
    recentBytes > halfBudget ? "recent" : longTermBytes > halfBudget ? "long_term" : null;
  const evictionOrder = [...records].sort((left, right) => {
    if (preferredTier && left.tier !== right.tier) {
      return left.tier === preferredTier ? -1 : 1;
    }
    if (left.tier !== right.tier) return left.tier === "recent" ? -1 : 1;
    return left.lastAccessedAt - right.lastAccessedAt;
  });
  for (const record of evictionOrder) {
    if (byKey.size <= policy.maxEntries && bytes <= policy.maxBytes) break;
    byKey.delete(record.key);
    bytes -= record.byteSize;
  }
  return [...byKey.values()].sort((left, right) => right.lastAccessedAt - left.lastAccessedAt);
}

export const sessionCache: ResultCache = {
  async get(key, now = Date.now()) {
    const records = await readRecords();
    const record = records.find((item) => item.key === key);
    if (!record || record.expiresAt <= now) {
      if (record) await writeRecords(records.filter((item) => item.key !== key));
      return undefined;
    }
    const hitCount = record.hitCount + 1;
    const promoted = record.promotable && hitCount >= 2;
    const updated: CacheRecord = {
      ...record,
      hitCount,
      tier: promoted ? "long_term" : record.tier,
      lastAccessedAt: now,
    };
    await writeRecords(records.map((item) => (item.key === key ? updated : item)));
    return updated;
  },
  async put(key, output, policy, now = Date.now(), options = {}) {
    if (!output || policy.mode === "off") return;
    const next = createCacheRecord(key, output, policy, now, options);
    if (next.byteSize > policy.maxBytes) return;
    const records = (await readRecords())
      .filter((record) => record.key !== key && record.expiresAt > now)
      .concat(next);
    await writeRecords(retainWithinPolicy(records, policy));
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
      recentEntries: valid.filter((record) => record.tier === "recent").length,
      recentBytes: valid
        .filter((record) => record.tier === "recent")
        .reduce((sum, record) => sum + record.byteSize, 0),
      longTermEntries: valid.filter((record) => record.tier === "long_term").length,
      longTermBytes: valid
        .filter((record) => record.tier === "long_term")
        .reduce((sum, record) => sum + record.byteSize, 0),
      reuseHits: valid.reduce((sum, record) => sum + record.hitCount, 0),
      estimatedTokensSaved: valid.reduce(
        (sum, record) => sum + record.hitCount * record.estimatedTokens,
        0,
      ),
    };
  },
};

export async function putSessionCacheBatch(
  values: Array<{ key: string; output: string; options?: CachePutOptions }>,
  policy: CachePolicy,
  now = Date.now(),
): Promise<void> {
  if (policy.mode === "off") return;
  const byKey = new Map(
    (await readRecords())
      .filter((record) => record.expiresAt > now)
      .map((record) => [record.key, record]),
  );
  for (const value of values) {
    if (!value.output) continue;
    const record = createCacheRecord(value.key, value.output, policy, now, value.options);
    if (record.byteSize <= policy.maxBytes) byKey.set(record.key, record);
  }
  await writeRecords(retainWithinPolicy([...byKey.values()], policy));
}
