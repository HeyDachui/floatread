import { createCacheKey } from "./key";
import { indexedDbCache } from "./indexeddb-cache";
import { sessionCache } from "./session-cache";
import type { CacheKeyInput, CachePolicy, CacheRecord, CacheStats, ResultCache } from "./types";

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
  const cache = repository(policy);
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
): Promise<void> {
  try {
    await repository(policy)?.put(key, output, policy);
  } catch {
    // Cache failures never prevent reading requests from completing.
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
          }
        : total,
    { entries: 0, bytes: 0, expiredRemoved: 0 },
  );
}
