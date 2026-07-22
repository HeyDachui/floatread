import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { createCacheRecord, parseCacheRecord } from "./record";
import type { CachePolicy, CachePutOptions, CacheRecord, ResultCache } from "./types";

const LONG_TERM_TTL_MS = 365 * 86_400_000;
const LONG_TERM_PROMOTION_HITS = 2;

interface FloatReadCacheDb extends DBSchema {
  results: {
    key: string;
    value: CacheRecord;
    indexes: { "by-last-accessed": number; "by-expiry": number };
  };
}

let databasePromise: Promise<IDBPDatabase<FloatReadCacheDb>> | undefined;

function database(): Promise<IDBPDatabase<FloatReadCacheDb>> {
  databasePromise ??= openDB<FloatReadCacheDb>("floatread-result-cache", 1, {
    upgrade(db) {
      const store = db.createObjectStore("results", { keyPath: "key" });
      store.createIndex("by-last-accessed", "lastAccessedAt");
      store.createIndex("by-expiry", "expiresAt");
    },
  });
  return databasePromise;
}

async function removeExpired(db: IDBPDatabase<FloatReadCacheDb>, now: number): Promise<number> {
  const transaction = db.transaction("results", "readwrite");
  const index = transaction.store.index("by-expiry");
  let cursor = await index.openCursor(IDBKeyRange.upperBound(now));
  let removed = 0;
  while (cursor) {
    await cursor.delete();
    removed += 1;
    cursor = await cursor.continue();
  }
  await transaction.done;
  return removed;
}

async function enforceCapacity(
  db: IDBPDatabase<FloatReadCacheDb>,
  policy: CachePolicy,
): Promise<void> {
  const transaction = db.transaction("results", "readwrite");
  const rawRecords: unknown[] = await transaction.store.index("by-last-accessed").getAll();
  const records = rawRecords.flatMap((raw) => {
    const record = parseCacheRecord(raw);
    return record ? [record] : [];
  });
  let bytes = records.reduce((sum, record) => sum + record.byteSize, 0);
  let entries = records.length;
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
    if (entries <= policy.maxEntries && bytes <= policy.maxBytes) break;
    await transaction.store.delete(record.key);
    entries -= 1;
    bytes -= record.byteSize;
  }
  await transaction.done;
}

export const indexedDbCache: ResultCache = {
  async get(key, now = Date.now()) {
    const db = await database();
    const raw: unknown = await db.get("results", key);
    const parsed = parseCacheRecord(raw);
    if (!parsed || parsed.expiresAt <= now) {
      if (raw !== undefined) await db.delete("results", key);
      return undefined;
    }
    const hitCount = parsed.hitCount + 1;
    const promoted = parsed.promotable && hitCount >= LONG_TERM_PROMOTION_HITS;
    const updated: CacheRecord = {
      ...parsed,
      hitCount,
      tier: promoted ? "long_term" : parsed.tier,
      expiresAt: promoted ? Math.max(parsed.expiresAt, now + LONG_TERM_TTL_MS) : parsed.expiresAt,
      lastAccessedAt: now,
    };
    await db.put("results", updated);
    return updated;
  },
  async put(key, output, policy, now = Date.now(), options = {}) {
    if (!output || policy.mode === "off") return;
    const record = createCacheRecord(key, output, policy, now, options);
    if (record.byteSize > policy.maxBytes) return;
    const db = await database();
    await removeExpired(db, now);
    await db.put("results", record);
    await enforceCapacity(db, policy);
  },
  async clear() {
    const db = await database();
    await db.clear("results");
  },
  async stats(now = Date.now()) {
    const db = await database();
    const expiredRemoved = await removeExpired(db, now);
    const records = (await db.getAll("results")).flatMap((raw) => {
      const record = parseCacheRecord(raw);
      return record ? [record] : [];
    });
    const recent = records.filter((record) => record.tier === "recent");
    const longTerm = records.filter((record) => record.tier === "long_term");
    return {
      entries: records.length,
      bytes: records.reduce((sum, record) => sum + record.byteSize, 0),
      expiredRemoved,
      recentEntries: recent.length,
      recentBytes: recent.reduce((sum, record) => sum + record.byteSize, 0),
      longTermEntries: longTerm.length,
      longTermBytes: longTerm.reduce((sum, record) => sum + record.byteSize, 0),
      reuseHits: records.reduce((sum, record) => sum + record.hitCount, 0),
      estimatedTokensSaved: records.reduce(
        (sum, record) => sum + record.hitCount * record.estimatedTokens,
        0,
      ),
    };
  },
};

export async function putIndexedDbCacheBatch(
  values: Array<{ key: string; output: string; options?: CachePutOptions }>,
  policy: CachePolicy,
  now = Date.now(),
): Promise<void> {
  const records = values
    .filter((value) => value.output.length > 0)
    .map((value) => createCacheRecord(value.key, value.output, policy, now, value.options))
    .filter((record) => record.byteSize <= policy.maxBytes);
  if (records.length === 0 || policy.mode === "off") return;
  const db = await database();
  await removeExpired(db, now);
  const transaction = db.transaction("results", "readwrite");
  await Promise.all(records.map((record) => transaction.store.put(record)));
  await transaction.done;
  await enforceCapacity(db, policy);
}

export function resetCacheDatabaseForTests(): void {
  databasePromise = undefined;
}
