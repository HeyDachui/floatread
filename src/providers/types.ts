import type { PublicError } from "../shared/errors";

export type ProviderKind =
  "openai" | "openai_compatible" | "deepseek" | "anthropic" | "gemini" | "ollama";

export type SecretStorageMode = "local" | "session" | "prompt_each_time";

export interface ProviderProfile {
  id: string;
  displayName: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  secretStorageMode: SecretStorageMode;
  timeoutMs: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProviderRequest {
  requestId: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
  temperature?: number | undefined;
}

export type ProviderStreamEvent =
  | { type: "start" }
  | { type: "delta"; text: string }
  | { type: "usage"; inputTokens?: number | undefined; outputTokens?: number | undefined }
  | { type: "done" };

export interface ConnectionTestResult {
  ok: boolean;
  providerLabel: string;
  firstByteMs?: number | undefined;
  totalMs: number;
  error?: PublicError | undefined;
}

export interface ProviderCompletion {
  text: string;
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
}

export interface ProviderAdapter {
  readonly kind: ProviderKind;
  validateConfig(profile: ProviderProfile): { valid: true } | { valid: false; error: PublicError };
  testConnection(
    profile: ProviderProfile,
    apiKey: string | undefined,
    signal: AbortSignal,
  ): Promise<ConnectionTestResult>;
  complete(
    request: ProviderRequest,
    profile: ProviderProfile,
    apiKey: string | undefined,
    signal: AbortSignal,
  ): Promise<ProviderCompletion>;
  stream(
    request: ProviderRequest,
    profile: ProviderProfile,
    apiKey: string | undefined,
    signal: AbortSignal,
  ): AsyncGenerator<ProviderStreamEvent>;
}

export class ProviderFailure extends Error {
  public readonly publicError: PublicError;
  public readonly status: number | undefined;

  public constructor(publicError: PublicError, status?: number) {
    super(publicError.message);
    this.name = "ProviderFailure";
    this.publicError = publicError;
    this.status = status;
  }
}
