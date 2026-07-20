import { z } from "zod";

const PAUSED_ORIGINS_KEY = "pausedOriginsV1";
const pausedOriginsSchema = z.array(z.string().url().max(2_048)).max(200);

export function pageOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

export async function getPausedOrigins(): Promise<string[]> {
  const stored = await chrome.storage.local.get(PAUSED_ORIGINS_KEY);
  const parsed = pausedOriginsSchema.safeParse(stored[PAUSED_ORIGINS_KEY]);
  return parsed.success ? parsed.data : [];
}

export async function isSitePaused(url: string | undefined): Promise<boolean> {
  const origin = pageOrigin(url);
  return origin ? (await getPausedOrigins()).includes(origin) : false;
}

export async function setSitePaused(url: string | undefined, paused: boolean): Promise<string> {
  const origin = pageOrigin(url);
  if (!origin) throw new Error("UNSUPPORTED_PAGE");
  const current = await getPausedOrigins();
  const next = paused
    ? [origin, ...current.filter((item) => item !== origin)].slice(0, 200)
    : current.filter((item) => item !== origin);
  await chrome.storage.local.set({ [PAUSED_ORIGINS_KEY]: next });
  return origin;
}
