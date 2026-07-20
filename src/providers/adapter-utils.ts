import { publicError } from "../shared/errors";
import { providerProfileSchema } from "./schemas";
import { validateProviderUrl } from "./config";
import {
  ProviderFailure,
  type ConnectionTestResult,
  type ProviderAdapter,
  type ProviderProfile,
  type ProviderRequest,
} from "./types";

export function validateProfile(
  profile: ProviderProfile,
): ReturnType<ProviderAdapter["validateConfig"]> {
  if (!providerProfileSchema.safeParse(profile).success) {
    return { valid: false, error: publicError("INVALID_PROVIDER_CONFIG", "Provider 配置不完整。") };
  }
  const url = validateProviderUrl(profile);
  return url.valid ? { valid: true } : { valid: false, error: url.error };
}

export function assertProfile(adapter: ProviderAdapter, profile: ProviderProfile): void {
  const validation = adapter.validateConfig(profile);
  if (!validation.valid) throw new ProviderFailure(validation.error);
}

const CONNECTION_REQUEST: ProviderRequest = {
  requestId: "connection-test",
  systemPrompt: "Return only the uppercase letters OK. Do not add punctuation.",
  userPrompt: "Reply with OK.",
  maxOutputTokens: 8,
  temperature: 0,
};

export async function runConnectionTest(
  adapter: ProviderAdapter,
  profile: ProviderProfile,
  apiKey: string | undefined,
  signal: AbortSignal,
): Promise<ConnectionTestResult> {
  const startedAt = performance.now();
  try {
    const result = await adapter.complete(CONNECTION_REQUEST, profile, apiKey, signal);
    const totalMs = Math.max(0, Math.round(performance.now() - startedAt));
    if (result.text.trim().length === 0) {
      throw new ProviderFailure(publicError("INVALID_RESPONSE", "连接成功，但模型没有返回文本。"));
    }
    return {
      ok: true,
      providerLabel: profile.displayName,
      firstByteMs: totalMs,
      totalMs,
    };
  } catch (error) {
    const totalMs = Math.max(0, Math.round(performance.now() - startedAt));
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        providerLabel: profile.displayName,
        totalMs,
        error: publicError("ABORTED", "连接测试已取消。"),
      };
    }
    const publicFailure =
      error instanceof ProviderFailure
        ? error.publicError
        : publicError("UNKNOWN", "连接测试失败。", false);
    return { ok: false, providerLabel: profile.displayName, totalMs, error: publicFailure };
  }
}

export function requireResponseBody(response: Response): ReadableStream<Uint8Array> {
  if (!response.body) {
    throw new ProviderFailure(publicError("INVALID_RESPONSE", "Provider 没有返回响应正文。"));
  }
  return response.body;
}

export function requireText(text: string | undefined): string {
  if (!text) throw new ProviderFailure(publicError("INVALID_RESPONSE", "模型返回格式异常。"));
  return text;
}
