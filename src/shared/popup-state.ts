import { z } from "zod";
import { skinManifestV1Schema } from "../skins/schema";
import { usageSessionSchema } from "../storage/usage";

export const popupStateSchema = z
  .object({
    globalEnabled: z.boolean(),
    supportedPage: z.boolean(),
    siteAccess: z.boolean(),
    currentOrigin: z.string().max(2_048).nullable(),
    sitePaused: z.boolean(),
    companionVisible: z.boolean(),
    pageTranslation: z
      .object({
        enabled: z.boolean(),
        active: z.boolean(),
        status: z.enum([
          "idle",
          "scanning",
          "translating",
          "watching",
          "background_paused",
          "paused",
          "error",
        ]),
        translatedCount: z.number().int().nonnegative(),
      })
      .strict(),
    provider: z
      .object({
        configured: z.boolean(),
        label: z.string().min(1).max(80).optional(),
        model: z.string().min(1).max(200).optional(),
      })
      .strict(),
    skin: z
      .object({
        id: z.string().min(1).max(64),
        name: z.string().min(1).max(80),
        panel: skinManifestV1Schema.shape.panel,
      })
      .strict(),
    usage: usageSessionSchema.nullable(),
  })
  .strict();

export type PopupState = z.infer<typeof popupStateSchema>;
