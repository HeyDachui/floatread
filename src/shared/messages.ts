import { z } from "zod";
import type { PublicError } from "./errors";
import { providerProfileSchema } from "../providers/schemas";
import { appearanceOverridesSchema, cachePolicySchema } from "./schemas";
import { skinStateSchema } from "../skins/schema";
import { companionPositionSchema, readerModeSchema } from "./schemas";

export const contentToBackgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("GET_PUBLIC_BOOTSTRAP") }).strict(),
  z
    .object({
      type: z.literal("UPDATE_COMPANION_POSITION"),
      position: companionPositionSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("OPEN_OPTIONS"),
      section: z.enum(["provider", "appearance", "privacy"]).optional(),
    })
    .strict(),
  z.object({ type: z.literal("GET_ACTIVE_SKIN_ASSET"), state: skinStateSchema }).strict(),
]);

export type ContentToBackgroundMessage = z.infer<typeof contentToBackgroundSchema>;

export const trustedToBackgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("LIST_PROVIDER_PROFILES") }).strict(),
  z
    .object({
      type: z.literal("SAVE_PROVIDER_PROFILE"),
      profile: providerProfileSchema,
      secret: z.string().max(1_000).optional(),
    })
    .strict(),
  z
    .object({ type: z.literal("DELETE_PROVIDER_PROFILE"), profileId: z.string().min(8).max(64) })
    .strict(),
  z
    .object({ type: z.literal("ACTIVATE_PROVIDER_PROFILE"), profileId: z.string().min(8).max(64) })
    .strict(),
  z
    .object({ type: z.literal("CLEAR_PROVIDER_SECRET"), profileId: z.string().min(8).max(64) })
    .strict(),
  z
    .object({ type: z.literal("TEST_PROVIDER_CONNECTION"), profileId: z.string().min(8).max(64) })
    .strict(),
  z.object({ type: z.literal("GET_CACHE_STATUS") }).strict(),
  z
    .object({
      type: z.literal("GET_POPUP_STATE"),
      targetTabId: z.number().int().positive().optional(),
    })
    .strict(),
  z.object({ type: z.literal("GET_READING_PREFERENCES") }).strict(),
  z
    .object({
      type: z.literal("UPDATE_READING_PREFERENCES"),
      defaultMode: readerModeSchema,
      clickBehavior: z.enum(["show_actions", "run_default_mode"]),
      locale: z.enum(["auto", "zh_CN", "en"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_GLOBAL_ENABLED"),
      enabled: z.boolean(),
      targetTabId: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_SITE_PAUSED_CURRENT"),
      paused: z.boolean(),
      targetTabId: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_CURRENT_TAB_COMPANION"),
      visible: z.boolean(),
      targetTabId: z.number().int().positive().optional(),
    })
    .strict(),
  z.object({ type: z.literal("UPDATE_CACHE_POLICY"), cache: cachePolicySchema }).strict(),
  z.object({ type: z.literal("CLEAR_RESULT_CACHE") }).strict(),
  z.object({ type: z.literal("RESTORE_DEFAULT_SETTINGS") }).strict(),
  z.object({ type: z.literal("LIST_RUNTIME_SKINS") }).strict(),
  z
    .object({ type: z.literal("UPDATE_APPEARANCE"), appearance: appearanceOverridesSchema })
    .strict(),
  z.object({ type: z.literal("ACTIVATE_SKIN"), skinId: z.string().min(1).max(64) }).strict(),
  z
    .object({ type: z.literal("DELETE_INSTALLED_SKIN"), skinId: z.string().min(1).max(64) })
    .strict(),
]);

export type TrustedToBackgroundMessage = z.infer<typeof trustedToBackgroundSchema>;

export const backgroundToContentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SHOW_COMPANION") }).strict(),
  z.object({ type: z.literal("HIDE_COMPANION") }).strict(),
  z.object({ type: z.literal("TOGGLE_COMPANION") }).strict(),
  z.object({ type: z.literal("REFRESH_COMPANION") }).strict(),
  z.object({ type: z.literal("GET_COMPANION_STATUS") }).strict(),
  z
    .object({
      type: z.literal("RUN_SELECTION"),
      mode: readerModeSchema.optional(),
      text: z.string().min(1).max(12_000).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SHOW_SELECTION_ERROR"),
      reason: z.enum(["EMPTY", "TOO_LONG"]),
      length: z.number().int().nonnegative(),
    })
    .strict(),
  z.object({ type: z.literal("COPY_LAST_RESULT") }).strict(),
]);

export type BackgroundToContentMessage = z.infer<typeof backgroundToContentSchema>;

export type BackgroundResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: { code: "INVALID_MESSAGE" | "INTERNAL_ERROR"; message: string } };

const requestIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/u);

export const generationPortIncomingSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("GENERATE_START"),
      requestId: requestIdSchema,
      text: z.string().min(1).max(12_000),
      mode: readerModeSchema,
    })
    .strict(),
  z.object({ type: z.literal("GENERATE_CANCEL"), requestId: requestIdSchema }).strict(),
]);

export type GenerationPortIncoming = z.infer<typeof generationPortIncomingSchema>;

export type GenerationPortOutgoing =
  | { type: "STREAM_START"; requestId: string; cached: boolean; providerLabel: string }
  | { type: "STREAM_DELTA"; requestId: string; text: string }
  | { type: "STREAM_DONE"; requestId: string }
  | { type: "STREAM_ERROR"; requestId: string; error: PublicError };

const publicErrorSchema = z
  .object({
    code: z.enum([
      "NO_SELECTION",
      "SELECTION_TOO_LONG",
      "PROVIDER_NOT_CONFIGURED",
      "SECRET_REQUIRED",
      "HOST_PERMISSION_DENIED",
      "UNSUPPORTED_PAGE",
      "INVALID_PROVIDER_CONFIG",
      "INVALID_API_KEY",
      "FORBIDDEN",
      "MODEL_NOT_FOUND",
      "RATE_LIMITED",
      "QUOTA_EXCEEDED",
      "NETWORK_ERROR",
      "TIMEOUT",
      "INVALID_RESPONSE",
      "PROVIDER_ERROR",
      "ABORTED",
      "SKIN_INVALID",
      "STORAGE_ERROR",
      "UNKNOWN",
    ]),
    message: z.string().min(1).max(500),
    suggestion: z.string().min(1).max(500).optional(),
    retryable: z.boolean(),
  })
  .strict();

export const generationPortOutgoingSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("STREAM_START"),
      requestId: requestIdSchema,
      cached: z.boolean(),
      providerLabel: z.string().min(1).max(100),
    })
    .strict(),
  z
    .object({
      type: z.literal("STREAM_DELTA"),
      requestId: requestIdSchema,
      text: z.string().max(20_000),
    })
    .strict(),
  z.object({ type: z.literal("STREAM_DONE"), requestId: requestIdSchema }).strict(),
  z
    .object({
      type: z.literal("STREAM_ERROR"),
      requestId: requestIdSchema,
      error: publicErrorSchema,
    })
    .strict(),
]);

export const GENERATION_PORT_NAME = "floatread-generation";
