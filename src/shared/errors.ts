export type ErrorCode =
  | "NO_SELECTION"
  | "SELECTION_TOO_LONG"
  | "PROVIDER_NOT_CONFIGURED"
  | "SECRET_REQUIRED"
  | "HOST_PERMISSION_DENIED"
  | "UNSUPPORTED_PAGE"
  | "INVALID_PROVIDER_CONFIG"
  | "INVALID_API_KEY"
  | "FORBIDDEN"
  | "MODEL_NOT_FOUND"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "PROVIDER_ERROR"
  | "ABORTED"
  | "SKIN_INVALID"
  | "STORAGE_ERROR"
  | "UNKNOWN";

export interface PublicError {
  code: ErrorCode;
  message: string;
  suggestion?: string | undefined;
  retryable: boolean;
}

export function publicError(code: ErrorCode, message: string, retryable = false): PublicError {
  return { code, message, retryable };
}
