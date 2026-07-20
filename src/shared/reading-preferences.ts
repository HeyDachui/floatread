import { z } from "zod";
import { clickBehaviorSchema, readerModeSchema } from "./schemas";

export const readingPreferencesSchema = z
  .object({
    defaultMode: readerModeSchema,
    clickBehavior: clickBehaviorSchema,
    locale: z.enum(["auto", "zh_CN", "en"]),
  })
  .strict();

export type ReadingPreferences = z.infer<typeof readingPreferencesSchema>;
