import { z } from "zod";
import { cachePolicySchema } from "../shared/schemas";

export const cacheStatusSchema = z
  .object({
    policy: cachePolicySchema,
    stats: z
      .object({
        entries: z.number().int().nonnegative(),
        bytes: z.number().int().nonnegative(),
        expiredRemoved: z.number().int().nonnegative(),
        recentEntries: z.number().int().nonnegative(),
        recentBytes: z.number().int().nonnegative(),
        longTermEntries: z.number().int().nonnegative(),
        longTermBytes: z.number().int().nonnegative(),
        reuseHits: z.number().int().nonnegative(),
        estimatedTokensSaved: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
