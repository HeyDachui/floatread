import {
  PAGE_TRANSLATION_PORT_NAME,
  pageTranslationPortOutgoingSchema,
  type PageTranslationPortOutgoing,
} from "../shared/messages";
import {
  DEFAULT_TRANSLATION_PREFERENCES,
  type TranslationLanguage,
  type TranslationPreferences,
} from "../translation/languages";
import { collectVisiblePageScan, type PageTextSegment } from "./page-scanner";

export type PageTranslationState =
  | { status: "idle"; translatedCount: number; detectedLanguages?: TranslationLanguage[] }
  | {
      status: "scanning" | "translating" | "watching";
      translatedCount: number;
      detectedLanguages?: TranslationLanguage[];
    }
  | { status: "paused"; translatedCount: number; detectedLanguages?: TranslationLanguage[] }
  | {
      status: "error";
      translatedCount: number;
      message: string;
      detectedLanguages?: TranslationLanguage[];
    };

interface AppliedTranslation {
  original: string;
  translation: string;
}

let state: PageTranslationState = { status: "idle", translatedCount: 0 };
let active = false;
let busy = false;
let port: chrome.runtime.Port | null = null;
let currentJobId: string | null = null;
let currentSessionId: string | null = null;
let translationPreferences: TranslationPreferences = DEFAULT_TRANSLATION_PREFERENCES;
let observer: MutationObserver | null = null;
let scheduleTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectStableTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_STABLE_MS = 2_000;
const applied = new Map<Text, AppliedTranslation>();
const pending = new Map<string, PageTextSegment>();
const listeners = new Set<(value: PageTranslationState) => void>();

function publish(next: PageTranslationState): void {
  state = {
    ...next,
    detectedLanguages: next.detectedLanguages ?? state.detectedLanguages ?? [],
  };
  for (const listener of listeners) listener(state);
}

function translatedCount(): number {
  for (const [node, record] of applied) {
    if (!node.isConnected || node.nodeValue !== record.translation) applied.delete(node);
  }
  return applied.size;
}

function ensurePort(): chrome.runtime.Port {
  if (port) return port;
  const connectedPort = chrome.runtime.connect({ name: PAGE_TRANSLATION_PORT_NAME });
  port = connectedPort;
  connectedPort.onMessage.addListener((rawMessage: unknown) => {
    const parsed = pageTranslationPortOutgoingSchema.safeParse(rawMessage);
    if (parsed.success) handleEvent(parsed.data);
  });
  connectedPort.onDisconnect.addListener(() => {
    if (port !== connectedPort) return;
    port = null;
    if (active) {
      if (reconnectStableTimer) clearTimeout(reconnectStableTimer);
      reconnectStableTimer = undefined;
      reconnectAttempts += 1;
      busy = false;
      currentJobId = null;
      pending.clear();
      stopWatching();
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        failReconnect();
        return;
      }
      publish({ status: "scanning", translatedCount: translatedCount() });
      scheduleReconnect(500 * reconnectAttempts);
    }
  });
  return connectedPort;
}

function failReconnect(): void {
  active = false;
  busy = false;
  currentJobId = null;
  pending.clear();
  reconnectAttempts = 0;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  if (reconnectStableTimer) clearTimeout(reconnectStableTimer);
  reconnectStableTimer = undefined;
  stopWatching();
  publish({
    status: "error",
    translatedCount: translatedCount(),
    message: "页面翻译连接已断开，自动恢复失败，请重试。",
  });
  currentSessionId = null;
}

function reconnect(): void {
  reconnectTimer = undefined;
  if (!active || !currentSessionId) return;
  try {
    const connectedPort = ensurePort();
    connectedPort.postMessage({
      type: "PAGE_TRANSLATION_SESSION_START",
      sessionId: currentSessionId,
      translation: translationPreferences,
    });
    if (reconnectStableTimer) clearTimeout(reconnectStableTimer);
    reconnectStableTimer = setTimeout(() => {
      reconnectAttempts = 0;
      reconnectStableTimer = undefined;
    }, RECONNECT_STABLE_MS);
    startWatching();
    publish({ status: "scanning", translatedCount: translatedCount() });
    scheduleScan(100);
  } catch {
    reconnectAttempts += 1;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      failReconnect();
      return;
    }
    scheduleReconnect(500 * reconnectAttempts);
  }
}

function scheduleReconnect(delay = 350): void {
  if (!active || reconnectTimer) return;
  reconnectTimer = setTimeout(reconnect, delay);
}

function clearReconnect(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  if (reconnectStableTimer) clearTimeout(reconnectStableTimer);
  reconnectStableTimer = undefined;
  reconnectAttempts = 0;
}

function handleEvent(event: PageTranslationPortOutgoing): void {
  if (event.jobId !== currentJobId || !active) return;
  if (event.type === "PAGE_BATCH_PROGRESS") {
    publish({ status: "translating", translatedCount: translatedCount() });
    return;
  }
  if (event.type === "PAGE_SEGMENT_RESULT") {
    const segment = pending.get(event.id);
    if (!segment || !segment.node.isConnected) return;
    if (segment.node.nodeValue !== segment.original) return;
    segment.node.nodeValue = event.text;
    applied.set(segment.node, { original: segment.original, translation: event.text });
    publish({ status: "translating", translatedCount: translatedCount() });
    return;
  }
  if (event.type === "PAGE_BATCH_ERROR") {
    if (currentSessionId) {
      ensurePort().postMessage({
        type: "PAGE_TRANSLATION_SESSION_END",
        sessionId: currentSessionId,
        reason: "error",
      });
    }
    currentSessionId = null;
    pending.clear();
    busy = false;
    active = false;
    currentJobId = null;
    clearReconnect();
    stopWatching();
    publish({
      status: "error",
      translatedCount: translatedCount(),
      message: event.error.message,
    });
    return;
  }
  if (event.type === "PAGE_BATCH_DONE" || event.type === "PAGE_BATCH_CANCELLED") {
    pending.clear();
    busy = false;
    currentJobId = null;
    if (active) {
      publish({ status: "watching", translatedCount: translatedCount() });
      scheduleScan(400);
    } else publish({ status: "paused", translatedCount: translatedCount() });
  }
}

function skippedNodes(): Set<Text> {
  return new Set([...applied.keys(), ...[...pending.values()].map((segment) => segment.node)]);
}

function scan(): void {
  scheduleTimer = undefined;
  if (!active || busy || !currentSessionId) return;
  publish({ status: "scanning", translatedCount: translatedCount() });
  const scanResult = collectVisiblePageScan(
    skippedNodes(),
    document,
    6,
    6_000,
    translationPreferences,
  );
  publish({
    status: "scanning",
    translatedCount: translatedCount(),
    detectedLanguages: scanResult.detectedLanguages,
  });
  const segments = scanResult.segments;
  if (segments.length === 0) {
    publish({ status: "watching", translatedCount: translatedCount() });
    return;
  }
  const jobId = crypto.randomUUID();
  currentJobId = jobId;
  busy = true;
  pending.clear();
  for (const segment of segments) pending.set(segment.id, segment);
  publish({ status: "translating", translatedCount: translatedCount() });
  ensurePort().postMessage({
    type: "PAGE_TRANSLATE_BATCH",
    jobId,
    sessionId: currentSessionId,
    segments: segments.map(({ id, text, kind, sourceLanguage }) => ({
      id,
      text,
      kind,
      sourceLanguage,
    })),
  });
}

function scheduleScan(delay = 260): void {
  if (!active) return;
  if (scheduleTimer) return;
  scheduleTimer = setTimeout(scan, delay);
}

const onViewportChange = (): void => scheduleScan(300);

function startWatching(): void {
  if (!observer && document.body) {
    observer = new MutationObserver(() => scheduleScan(750));
    observer.observe(document.body, { childList: true, subtree: true });
  }
  window.addEventListener("scroll", onViewportChange, { passive: true });
  window.addEventListener("resize", onViewportChange, { passive: true });
}

function stopWatching(): void {
  observer?.disconnect();
  observer = null;
  window.removeEventListener("scroll", onViewportChange);
  window.removeEventListener("resize", onViewportChange);
  if (scheduleTimer) clearTimeout(scheduleTimer);
  scheduleTimer = undefined;
}

export function startPageTranslation(
  preferences: TranslationPreferences = DEFAULT_TRANSLATION_PREFERENCES,
): void {
  if (active) return;
  clearReconnect();
  translationPreferences = preferences;
  currentSessionId = crypto.randomUUID();
  ensurePort().postMessage({
    type: "PAGE_TRANSLATION_SESSION_START",
    sessionId: currentSessionId,
    translation: translationPreferences,
  });
  active = true;
  startWatching();
  publish({ status: "scanning", translatedCount: translatedCount() });
  scheduleScan(0);
}

export function pausePageTranslation(reason: "stopped" | "cleared" | "error" = "stopped"): void {
  active = false;
  clearReconnect();
  stopWatching();
  if (currentJobId) {
    ensurePort().postMessage({
      type: "PAGE_TRANSLATE_CANCEL",
      jobId: currentJobId,
      sessionId: currentSessionId,
    });
  }
  if (currentSessionId) {
    ensurePort().postMessage({
      type: "PAGE_TRANSLATION_SESSION_END",
      sessionId: currentSessionId,
      reason,
    });
  }
  currentSessionId = null;
  currentJobId = null;
  busy = false;
  pending.clear();
  publish({ status: "paused", translatedCount: translatedCount() });
}

export function clearPageTranslation(): void {
  pausePageTranslation("cleared");
  for (const [node, record] of applied) {
    if (node.isConnected && node.nodeValue === record.translation) node.nodeValue = record.original;
  }
  applied.clear();
  publish({ status: "idle", translatedCount: 0 });
}

export function getPageTranslationState(): PageTranslationState {
  return state;
}

export function subscribePageTranslation(
  listener: (value: PageTranslationState) => void,
): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}
