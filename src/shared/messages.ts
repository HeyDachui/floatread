import { z } from "zod";
import { companionPositionSchema } from "./schemas";

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
]);

export type ContentToBackgroundMessage = z.infer<typeof contentToBackgroundSchema>;

export const backgroundToContentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SHOW_COMPANION") }).strict(),
  z.object({ type: z.literal("HIDE_COMPANION") }).strict(),
  z.object({ type: z.literal("TOGGLE_COMPANION") }).strict(),
]);

export type BackgroundToContentMessage = z.infer<typeof backgroundToContentSchema>;

export type BackgroundResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: { code: "INVALID_MESSAGE" | "INTERNAL_ERROR"; message: string } };
