import { z } from "zod";

export const skinStateSchema = z.enum(["idle", "ready", "thinking", "success", "error"]);
export const motionPresetSchema = z.enum([
  "none",
  "breathe",
  "float",
  "pulse",
  "bounce",
  "shake",
  "spin",
]);
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/u);
const assetPathSchema = z
  .string()
  .min(1)
  .max(160)
  .refine(
    (value) =>
      !value.includes("\\") &&
      !value.startsWith("/") &&
      !/(?:^|\/)\.\.(?:\/|$)/u.test(value) &&
      !value.includes(":") &&
      !/^(?:https?|data|javascript):/iu.test(value),
    "资源路径不安全。",
  )
  .refine((value) => /\.(?:png|webp)$/iu.test(value), "资源必须是 PNG 或 WebP。");

export const skinManifestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9-_]{1,63}$/u),
    name: z.string().trim().min(1).max(80),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u),
    author: z.string().trim().min(1).max(80),
    description: z.string().trim().max(300).optional(),
    license: z.string().trim().max(80).optional(),
    assets: z
      .object({
        idle: assetPathSchema,
        ready: assetPathSchema.optional(),
        thinking: assetPathSchema.optional(),
        success: assetPathSchema.optional(),
        error: assetPathSchema.optional(),
        preview: assetPathSchema,
      })
      .strict(),
    motions: z
      .object({
        idle: motionPresetSchema,
        ready: motionPresetSchema,
        thinking: motionPresetSchema,
        success: motionPresetSchema,
        error: motionPresetSchema,
      })
      .strict(),
    panel: z
      .object({
        accent: colorSchema,
        background: colorSchema,
        backgroundElevated: colorSchema,
        text: colorSchema,
        textMuted: colorSchema,
        border: colorSchema,
        success: colorSchema,
        warning: colorSchema,
        error: colorSchema,
        radius: z.number().min(8).max(24),
        shadowStrength: z.number().min(0).max(0.6),
      })
      .strict(),
  })
  .strict();

export const runtimeSkinSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(80),
    source: z.enum(["builtin", "community"]),
    variant: z.enum([
      "pet",
      "native",
      "lens",
      "glass-orb",
      "pixel-bot",
      "ink",
      "terminal",
      "community",
    ]),
    motions: z.record(skinStateSchema, motionPresetSchema),
    panel: skinManifestV1Schema.shape.panel,
    availableAssets: z.array(skinStateSchema).max(5),
    builtinAssetPath: z
      .string()
      .regex(/^pets\/[a-z0-9-_]+\/[a-z0-9-_]+\.webp$/u)
      .optional(),
  })
  .strict();

export const skinAssetResponseSchema = z
  .object({
    dataUrl: z.string().regex(/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/=]+$/u),
  })
  .strict();

export function migrateSkinManifest(raw: unknown): z.infer<typeof skinManifestV1Schema> | null {
  const current = skinManifestV1Schema.safeParse(raw);
  if (current.success) return current.data;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  if (source.schemaVersion !== 0) return null;
  const panel = source.panel;
  if (typeof panel !== "object" || panel === null || Array.isArray(panel)) return null;
  const { backgroundAlt, ...panelFields } = panel as Record<string, unknown>;
  const migrated = skinManifestV1Schema.safeParse({
    schemaVersion: 1,
    id: source.id,
    name: source.name,
    version: source.version,
    author: source.author,
    description: source.description,
    license: source.license,
    assets: source.assets,
    motions: source.motions,
    panel: {
      ...panelFields,
      backgroundElevated: panelFields.backgroundElevated ?? backgroundAlt,
      warning: panelFields.warning ?? "#FFD166",
    },
  });
  return migrated.success ? migrated.data : null;
}
