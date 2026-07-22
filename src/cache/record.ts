import { z } from "zod";
import type { CachePolicy, CachePutOptions, CacheRecord } from "./types";

export const cacheRecordSchema = z
  .object({
    schemaVersion: z.literal(2),
    key: z.string().regex(/^[a-f0-9]{64}$/u),
    output: z.string().min(1).max(200_000),
    namespace: z.enum(["reading", "page_translation"]),
    tier: z.enum(["recent", "long_term"]),
    hitCount: z.number().int().nonnegative(),
    promotable: z.boolean(),
    estimatedTokens: z.number().int().nonnegative(),
    createdAt: z.number().int().nonnegative(),
    lastAccessedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().nonnegative(),
    byteSize: z.number().int().positive(),
  })
  .strict();

const legacyCacheRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    key: z.string().regex(/^[a-f0-9]{64}$/u),
    output: z.string().min(1).max(200_000),
    createdAt: z.number().int().nonnegative(),
    lastAccessedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().nonnegative(),
    byteSize: z.number().int().positive(),
  })
  .strict();

export function parseCacheRecord(raw: unknown): CacheRecord | undefined {
  const current = cacheRecordSchema.safeParse(raw);
  if (current.success) return current.data;
  const legacy = legacyCacheRecordSchema.safeParse(raw);
  if (!legacy.success) return undefined;
  return {
    ...legacy.data,
    schemaVersion: 2,
    namespace: "reading",
    tier: "recent",
    hitCount: 0,
    promotable: false,
    estimatedTokens: 0,
  };
}

export function createCacheRecord(
  key: string,
  output: string,
  policy: CachePolicy,
  now: number,
  options: CachePutOptions = {},
): CacheRecord {
  const byteSize = new TextEncoder().encode(output).byteLength + 256;
  return {
    schemaVersion: 2,
    key,
    output,
    namespace: options.namespace ?? "reading",
    tier: "recent",
    hitCount: 0,
    promotable: options.promotable ?? false,
    estimatedTokens: Math.max(0, Math.floor(options.estimatedTokens ?? 0)),
    createdAt: now,
    lastAccessedAt: now,
    expiresAt: now + policy.ttlDays * 86_400_000,
    byteSize,
  };
}
