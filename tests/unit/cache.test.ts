import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { indexedDbCache, resetCacheDatabaseForTests } from "../../src/cache/indexeddb-cache";
import { createCacheKey } from "../../src/cache/key";
import type { CachePolicy } from "../../src/cache/types";

const POLICY: CachePolicy = {
  mode: "persistent",
  ttlDays: 7,
  maxEntries: 3,
  maxBytes: 1_000_000,
};

async function keyFor(text: string, model = "model-a"): Promise<string> {
  return createCacheKey({
    normalizedText: text,
    mode: "natural_zh",
    providerKind: "openai",
    providerBaseUrl: "https://api.openai.com/v1/",
    model,
    promptVersion: "1.0.0",
  });
}

beforeEach(async () => {
  resetCacheDatabaseForTests();
  await indexedDbCache.clear();
});

describe("result cache", () => {
  it("creates stable keys and varies every semantic cache dimension", async () => {
    const base = await keyFor("Café");
    await expect(keyFor("Cafe\u0301")).resolves.toBe(base);
    await expect(keyFor("Café", "model-b")).resolves.not.toBe(base);
    await expect(
      createCacheKey({
        normalizedText: "Café",
        mode: "key_points",
        providerKind: "openai",
        providerBaseUrl: "https://api.openai.com/v1",
        model: "model-a",
        promptVersion: "1.0.0",
      }),
    ).resolves.not.toBe(base);
  });

  it("returns a valid entry and removes it after expiry", async () => {
    const key = await keyFor("expiry");
    await indexedDbCache.put(key, "cached output", { ...POLICY, ttlDays: 1 }, 1_000);
    await expect(indexedDbCache.get(key, 2_000)).resolves.toMatchObject({
      output: "cached output",
      lastAccessedAt: 2_000,
    });
    await expect(indexedDbCache.get(key, 86_401_001)).resolves.toBeUndefined();
    await expect(indexedDbCache.stats()).resolves.toMatchObject({ entries: 0, bytes: 0 });
  });

  it("evicts least-recently-used entries over capacity", async () => {
    const keys = await Promise.all(["one", "two", "three"].map((text) => keyFor(text)));
    await indexedDbCache.put(keys[0] ?? "", "one", { ...POLICY, maxEntries: 2 }, 1_000);
    await indexedDbCache.put(keys[1] ?? "", "two", { ...POLICY, maxEntries: 2 }, 2_000);
    await indexedDbCache.get(keys[0] ?? "", 3_000);
    await indexedDbCache.put(keys[2] ?? "", "three", { ...POLICY, maxEntries: 2 }, 4_000);

    await expect(indexedDbCache.get(keys[1] ?? "", 5_000)).resolves.toBeUndefined();
    await expect(indexedDbCache.get(keys[0] ?? "", 5_000)).resolves.toBeDefined();
    await expect(indexedDbCache.get(keys[2] ?? "", 5_000)).resolves.toBeDefined();
  });

  it("rejects an entry larger than the configured byte budget", async () => {
    const key = await keyFor("oversized");
    await indexedDbCache.put(key, "x".repeat(1_001), { ...POLICY, maxBytes: 1_000 }, 1_000);
    await expect(indexedDbCache.get(key, 2_000)).resolves.toBeUndefined();
  });

  it("deletes a corrupted record instead of breaking the cache", async () => {
    const key = await keyFor("corrupt");
    const openRequest = indexedDB.open("floatread-result-cache", 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    const transaction = database.transaction("results", "readwrite");
    transaction.objectStore("results").put({
      schemaVersion: 1,
      key,
      output: "",
      createdAt: "broken",
      lastAccessedAt: 1,
      expiresAt: Number.MAX_SAFE_INTEGER,
      byteSize: -1,
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();

    await expect(indexedDbCache.get(key, 2_000)).resolves.toBeUndefined();
  });
});
