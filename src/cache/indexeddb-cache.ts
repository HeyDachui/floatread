import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { cacheRecordSchema, createCacheRecord } from "./record";
import type { CachePolicy, CacheRecord, ResultCache } from "./types";

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
  const records = await transaction.store.index("by-last-accessed").getAll();
  let bytes = records.reduce((sum, record) => sum + record.byteSize, 0);
  let entries = records.length;
  for (const record of records) {
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
    const parsed = cacheRecordSchema.safeParse(raw);
    if (!parsed.success || parsed.data.expiresAt <= now) {
      if (raw !== undefined) await db.delete("results", key);
      return undefined;
    }
    const updated = { ...parsed.data, lastAccessedAt: now };
    await db.put("results", updated);
    return updated;
  },
  async put(key, output, policy, now = Date.now()) {
    if (!output || policy.mode === "off") return;
    const record = createCacheRecord(key, output, policy, now);
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
    const records = await db.getAll("results");
    return {
      entries: records.length,
      bytes: records.reduce((sum, record) => sum + record.byteSize, 0),
      expiredRemoved,
    };
  },
};

export function resetCacheDatabaseForTests(): void {
  databasePromise = undefined;
}
