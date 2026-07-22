import { publicError, type PublicError } from "../shared/errors";
import { ProviderFailure } from "./types";

export function mapHttpError(status: number): PublicError {
  switch (status) {
    case 400:
      return publicError(
        "INVALID_PROVIDER_CONFIG",
        "请求参数不被 Provider 接受；兼容接口可能不支持某个参数。",
      );
    case 401:
      return publicError("INVALID_API_KEY", "API Key 无效或已失效。", false);
    case 403:
      return publicError("FORBIDDEN", "Provider 拒绝访问，请检查账户或模型权限。", false);
    case 404:
      return publicError("MODEL_NOT_FOUND", "接口或模型不存在，请检查 Base URL 与模型名。", false);
    case 408:
      return publicError("TIMEOUT", "Provider 请求超时。", true);
    case 429:
      return publicError("RATE_LIMITED", "Provider 请求过多或额度暂不可用。", true);
    default:
      if (status >= 500) return publicError("PROVIDER_ERROR", "Provider 服务暂时不可用。", true);
      return publicError("PROVIDER_ERROR", `Provider 请求失败（HTTP ${status}）。`, false);
  }
}

export async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;
  throw new ProviderFailure(mapHttpError(response.status), response.status);
}

export async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new ProviderFailure(publicError("INVALID_RESPONSE", "Provider 返回了无效 JSON。"));
  }
}

export async function providerFetch(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ProviderFailure(publicError("NETWORK_ERROR", "无法连接 Provider。", true));
  }
}

export function requireApiKey(apiKey: string | undefined): string {
  const normalized = apiKey?.trim();
  if (!normalized) {
    throw new ProviderFailure(
      publicError(
        "SECRET_REQUIRED",
        "未找到 API Key。若使用“仅本次会话”或“每次输入”，请在设置中重新输入。",
        false,
      ),
    );
  }
  return normalized;
}
