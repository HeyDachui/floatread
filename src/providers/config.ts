import { publicError } from "../shared/errors";
import type { ProviderKind, ProviderProfile } from "./types";

export const PROVIDER_DEFAULTS: Record<
  ProviderKind,
  { displayName: string; baseUrl: string; modelExample: string; requiresSecret: boolean }
> = {
  openai: {
    displayName: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    modelExample: "gpt-5-mini",
    requiresSecret: true,
  },
  openai_compatible: {
    displayName: "OpenAI Compatible",
    baseUrl: "https://example.invalid/v1",
    modelExample: "your-model-name",
    requiresSecret: true,
  },
  deepseek: {
    displayName: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    modelExample: "deepseek-v4-flash",
    requiresSecret: true,
  },
  anthropic: {
    displayName: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    modelExample: "claude-sonnet-4-5",
    requiresSecret: true,
  },
  gemini: {
    displayName: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    modelExample: "gemini-2.5-flash",
    requiresSecret: true,
  },
  ollama: {
    displayName: "Ollama",
    baseUrl: "http://localhost:11434",
    modelExample: "gemma3",
    requiresSecret: false,
  },
};

export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/u, "");
}

export function validateProviderUrl(
  profile: Pick<ProviderProfile, "kind" | "baseUrl">,
):
  | { valid: true; url: URL; permission: string }
  | { valid: false; error: ReturnType<typeof publicError> } {
  let url: URL;
  try {
    url = new URL(normalizeBaseUrl(profile.baseUrl));
  } catch {
    return { valid: false, error: publicError("INVALID_PROVIDER_CONFIG", "Base URL 格式无效。") };
  }
  if (url.username || url.password || url.hash || url.search) {
    return {
      valid: false,
      error: publicError("INVALID_PROVIDER_CONFIG", "Base URL 不能包含凭据、查询参数或片段。"),
    };
  }
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (profile.kind === "ollama") {
    if (!isLoopback || (url.protocol !== "http:" && url.protocol !== "https:")) {
      return {
        valid: false,
        error: publicError("INVALID_PROVIDER_CONFIG", "Ollama V1 仅允许 localhost 或 127.0.0.1。"),
      };
    }
  } else if (url.protocol !== "https:") {
    return {
      valid: false,
      error: publicError("INVALID_PROVIDER_CONFIG", "远程 Provider 必须使用 HTTPS。"),
    };
  }
  return { valid: true, url, permission: `${url.origin}/*` };
}

export function createProviderProfile(kind: ProviderKind, now = Date.now()): ProviderProfile {
  const preset = PROVIDER_DEFAULTS[kind];
  return {
    id: crypto.randomUUID(),
    displayName: preset.displayName,
    kind,
    baseUrl: preset.baseUrl,
    model: preset.modelExample,
    secretStorageMode: "session",
    timeoutMs: 60_000,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function endpoint(baseUrl: string, path: string): string {
  return `${normalizeBaseUrl(baseUrl)}/${path.replace(/^\/+/, "")}`;
}
