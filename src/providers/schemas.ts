import { z } from "zod";

export const providerKindSchema = z.enum([
  "openai",
  "openai_compatible",
  "deepseek",
  "anthropic",
  "gemini",
  "ollama",
]);
export const secretStorageModeSchema = z.enum(["local", "session", "prompt_each_time"]);

export const providerProfileSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/u),
    displayName: z.string().trim().min(1).max(80),
    kind: providerKindSchema,
    baseUrl: z.string().trim().min(1).max(500),
    model: z.string().trim().min(1).max(200),
    secretStorageMode: secretStorageModeSchema,
    timeoutMs: z.number().int().min(5_000).max(180_000),
    enabled: z.boolean(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export const providerProfilesSchema = z.array(providerProfileSchema).max(20);

export const connectionTestResultSchema = z
  .object({
    ok: z.boolean(),
    providerLabel: z.string().min(1).max(80),
    firstByteMs: z.number().nonnegative().optional(),
    totalMs: z.number().nonnegative(),
    error: z
      .object({
        code: z.string().min(1).max(80),
        message: z.string().min(1).max(500),
        suggestion: z.string().min(1).max(500).optional(),
        retryable: z.boolean(),
      })
      .strict()
      .optional(),
  })
  .strict();
