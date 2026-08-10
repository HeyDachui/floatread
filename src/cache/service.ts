import { createCacheKey } from "./key";
import { indexedDbCache, putIndexedDbCacheBatch } from "./indexeddb-cache";
import { putSessionCacheBatch, sessionCache } from "./session-cache";
import type {
  CacheKeyInput,
  CachePolicy,
  CachePutOptions,
  CacheRecord,
  CacheStats,
  ResultCache,
} from "./types";

export const AUTOMATIC_MEMORY_BYTES = 10_000_000;
export const AUTOMATIC_MEMORY_TIER_BYTES = 5_000_000;

export function automaticMemoryPolicy(policy: CachePolicy): CachePolicy {
  return {
    mode: policy.mode,
    ttlDays: 30,
    maxEntries: 20_000,
    maxBytes: AUTOMATIC_MEMORY_BYTES,
  };
}

function repository(policy: CachePolicy): ResultCache | null {
  if (policy.mode === "persistent") return indexedDbCache;
  if (policy.mode === "session") return sessionCache;
  return null;
}

export async function getCachedResult(
  input: CacheKeyInput,
  policy: CachePolicy,
): Promise<{ key: string; record?: CacheRecord | undefined }> {
  const key = await createCacheKey(input);
  const cache = repository(automaticMemoryPolicy(policy));
  if (!cache) return { key };
  try {
    return { key, record: await cache.get(key) };
  } catch {
    return { key };
  }
}

export async function putCachedResult(
  key: string,
  output: string,
  policy: CachePolicy,
  options: CachePutOptions = {},
): Promise<void> {
  try {
    const effective = automaticMemoryPolicy(policy);
    await repository(effective)?.put(key, output, effective, undefined, options);
  } catch {
    // Cache failures never prevent reading requests from completing.
  }
}

export async function getAutomaticMemory(
  keys: string[],
  policy: CachePolicy,
): Promise<Map<string, CacheRecord>> {
  const cache = repository(automaticMemoryPolicy(policy));
  if (!cache) return new Map();
  const records = await Promise.all(
    [...new Set(keys)].map(async (key) => {
      try {
        return [key, await cache.get(key)] as const;
      } catch {
        return [key, undefined] as const;
      }
    }),
  );
  return new Map(records.flatMap(([key, record]) => (record ? ([[key, record]] as const) : [])));
}

export async function putAutomaticMemory(
  values: Array<{ key: string; output: string; options?: CachePutOptions }>,
  policy: CachePolicy,
): Promise<boolean> {
  const effective = automaticMemoryPolicy(policy);
  const cache = repository(effective);
  if (!cache) return false;
  try {
    if (effective.mode === "persistent") await putIndexedDbCacheBatch(values, effective);
    else await putSessionCacheBatch(values, effective);
    return true;
  } catch {
    return false;
  }
}

export async function clearAllCaches(): Promise<void> {
  await Promise.allSettled([indexedDbCache.clear(), sessionCache.clear()]);
}

export async function getCacheStats(): Promise<CacheStats> {
  const stats = await Promise.allSettled([indexedDbCache.stats(), sessionCache.stats()]);
  return stats.reduce<CacheStats>(
    (total, result) =>
      result.status === "fulfilled"
        ? {
            entries: total.entries + result.value.entries,
            bytes: total.bytes + result.value.bytes,
            expiredRemoved: total.expiredRemoved + result.value.expiredRemoved,
            recentEntries: total.recentEntries + result.value.recentEntries,
            recentBytes: total.recentBytes + result.value.recentBytes,
            longTermEntries: total.longTermEntries + result.value.longTermEntries,
            longTermBytes: total.longTermBytes + result.value.longTermBytes,
            reuseHits: total.reuseHits + result.value.reuseHits,
            estimatedTokensSaved: total.estimatedTokensSaved + result.value.estimatedTokensSaved,
          }
        : total,
    {
      entries: 0,
      bytes: 0,
      expiredRemoved: 0,
      recentEntries: 0,
      recentBytes: 0,
      longTermEntries: 0,
      longTermBytes: 0,
      reuseHits: 0,
      estimatedTokensSaved: 0,
    },
  );
}
