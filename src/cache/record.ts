import { z } from "zod";
import type { CachePolicy, CacheRecord } from "./types";

export const cacheRecordSchema = z
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

export function createCacheRecord(
  key: string,
  output: string,
  policy: CachePolicy,
  now: number,
): CacheRecord {
  const byteSize = new TextEncoder().encode(output).byteLength;
  return {
    schemaVersion: 1,
    key,
    output,
    createdAt: now,
    lastAccessedAt: now,
    expiresAt: now + policy.ttlDays * 86_400_000,
    byteSize,
  };
}
