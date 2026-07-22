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

export type CacheTier = "recent" | "long_term";
export type CacheNamespace = "reading" | "page_translation";

export interface CachePutOptions {
  namespace?: CacheNamespace;
  promotable?: boolean;
  estimatedTokens?: number;
}

export interface CacheRecord {
  schemaVersion: 2;
  key: string;
  output: string;
  namespace: CacheNamespace;
  tier: CacheTier;
  hitCount: number;
  promotable: boolean;
  estimatedTokens: number;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  byteSize: number;
}

export interface CacheStats {
  entries: number;
  bytes: number;
  expiredRemoved: number;
  recentEntries: number;
  recentBytes: number;
  longTermEntries: number;
  longTermBytes: number;
  reuseHits: number;
  estimatedTokensSaved: number;
}

export interface ResultCache {
  get(key: string, now?: number): Promise<CacheRecord | undefined>;
  put(
    key: string,
    output: string,
    policy: CachePolicy,
    now?: number,
    options?: CachePutOptions,
  ): Promise<void>;
  clear(): Promise<void>;
  stats(now?: number): Promise<CacheStats>;
}
