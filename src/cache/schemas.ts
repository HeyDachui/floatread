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
      })
      .strict(),
  })
  .strict();
