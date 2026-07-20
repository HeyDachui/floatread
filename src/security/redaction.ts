const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/-]{6,}/giu,
  /\b(?:sk|AIza|key)[-_A-Za-z0-9.]{8,}/gu,
  /\b(?:api[_-]?key|authorization)\s*[:=]\s*[^\s,;]+/giu,
];

export function maskSecret(value: string): string {
  const normalized = value.trim();
  return normalized.length <= 4 ? "****" : `****${normalized.slice(-4)}`;
}

export function redactText(value: string): string {
  return SECRET_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, (match) => maskSecret(match)),
    value,
  );
}

export function safeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "invalid-origin";
  }
}

export const logger = {
  errorCode(code: string): void {
    console.error(`[FloatRead] ${redactText(code).slice(0, 120)}`);
  },
};
