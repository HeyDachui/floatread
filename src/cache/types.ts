import type { ReaderMode } from "../shared/types";

export interface CacheKeyInput {
  normalizedText: string;
  mode: ReaderMode;
  providerKind: string;
  providerBaseUrl: string;
  model: string;
  promptVersion: string;
}

export interface CachePolicy {
  mode: "persistent" | "session" | "off";
  ttlDays: number;
  maxEntries: number;
  maxBytes: number;
}

export interface CacheRecord {
  schemaVersion: 1;
  key: string;
  output: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  byteSize: number;
}

export interface CacheStats {
  entries: number;
  bytes: number;
  expiredRemoved: number;
}

export interface ResultCache {
  get(key: string, now?: number): Promise<CacheRecord | undefined>;
  put(key: string, output: string, policy: CachePolicy, now?: number): Promise<void>;
  clear(): Promise<void>;
  stats(now?: number): Promise<CacheStats>;
}
