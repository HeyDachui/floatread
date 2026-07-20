import type { CacheKeyInput } from "./types";

function canonicalCacheInput(input: CacheKeyInput): string {
  return JSON.stringify({
    mode: input.mode,
    model: input.model.trim(),
    normalizedText: input.normalizedText.normalize("NFC"),
    promptVersion: input.promptVersion,
    providerBaseUrl: input.providerBaseUrl.trim().replace(/\/+$/u, ""),
    providerKind: input.providerKind,
  });
}

export async function createCacheKey(input: CacheKeyInput): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalCacheInput(input));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
