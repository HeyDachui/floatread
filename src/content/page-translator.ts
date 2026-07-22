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
      status: "scanning" | "translating" | "watching" | "background_paused";
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
  sourceText: string;
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
let backgroundPaused = false;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_STABLE_MS = 2_000;
const applied = new Map<Text, AppliedTranslation>();
const pending = new Map<string, PageTextSegment>();
const listeners = new Set<(value: PageTranslationState) => void>();

export function restoreOriginalSelectionText(
  selectedText: string,
  translations: Iterable<Pick<AppliedTranslation, "sourceText" | "translation">>,
): string {
  let restored = selectedText;
  const records = [...translations]
    .filter((record) => record.translation.length > 0 && record.sourceText.length > 0)
    .sort((left, right) => right.translation.length - left.translation.length);
  for (const record of records) {
    const index = restored.indexOf(record.translation);
    if (index < 0) continue;
    restored = `${restored.slice(0, index)}${record.sourceText}${restored.slice(index + record.translation.length)}`;
  }
  return restored;
}

export function getOriginalTextForPrecisionReading(selectedText: string): string {
  const currentTranslations: AppliedTranslation[] = [];
  for (const [node, record] of applied) {
    if (node.isConnected && node.nodeValue === record.translation) currentTranslations.push(record);
  }
  return restoreOriginalSelectionText(selectedText, currentTranslations);
}

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
      if (backgroundPaused || document.hidden) {
        backgroundPaused = true;
        publish({ status: "background_paused", translatedCount: translatedCount() });
        return;
      }
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
  backgroundPaused = false;
  busy = false;
  currentJobId = null;
  pending.clear();
  reconnectAttempts = 0;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  if (reconnectStableTimer) clearTimeout(reconnectStableTimer);
  reconnectStableTimer = undefined;
  stopWatching();
  document.removeEventListener("visibilitychange", onVisibilityChange);
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
    applied.set(segment.node, {
      original: segment.original,
      sourceText: segment.text,
      translation: event.text,
    });
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
    backgroundPaused = false;
    currentJobId = null;
    clearReconnect();
    stopWatching();
    document.removeEventListener("visibilitychange", onVisibilityChange);
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
    if (active && backgroundPaused) {
      publish({ status: "background_paused", translatedCount: translatedCount() });
    } else if (active) {
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
  if (!active || busy || !currentSessionId || backgroundPaused || document.hidden) return;
  publish({ status: "scanning", translatedCount: translatedCount() });
  const limits =
    translationPreferences.quality === "fast"
      ? { segments: 12, characters: 12_000 }
      : translationPreferences.quality === "smart"
        ? { segments: 8, characters: 8_000 }
        : { segments: 6, characters: 6_000 };
  const scanResult = collectVisiblePageScan(
    skippedNodes(),
    document,
    limits.segments,
    limits.characters,
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
  if (!active || backgroundPaused || document.hidden) return;
  if (scheduleTimer) return;
  scheduleTimer = setTimeout(scan, delay);
}

const onViewportChange = (): void => scheduleScan(300);

const onVisibilityChange = (): void => {
  if (!active) return;
  if (document.hidden) {
    backgroundPaused = true;
    stopWatching();
    if (!busy) publish({ status: "background_paused", translatedCount: translatedCount() });
    return;
  }
  backgroundPaused = false;
  if (!port) {
    scheduleReconnect(0);
    return;
  }
  startWatching();
  publish({ status: "scanning", translatedCount: translatedCount() });
  scheduleScan(0);
};

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
  backgroundPaused = document.hidden;
  translationPreferences = preferences;
  currentSessionId = crypto.randomUUID();
  ensurePort().postMessage({
    type: "PAGE_TRANSLATION_SESSION_START",
    sessionId: currentSessionId,
    translation: translationPreferences,
  });
  active = true;
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (backgroundPaused) {
    publish({ status: "background_paused", translatedCount: translatedCount() });
  } else {
    startWatching();
    publish({ status: "scanning", translatedCount: translatedCount() });
    scheduleScan(0);
  }
}

export function addPageTranslationSourceLanguage(language: TranslationLanguage): boolean {
  if (
    language === translationPreferences.targetLanguage ||
    translationPreferences.sourceLanguages.includes(language) ||
    translationPreferences.sourceLanguages.length >= 5
  )
    return false;
  translationPreferences = {
    ...translationPreferences,
    sourceLanguages: [...translationPreferences.sourceLanguages, language],
  };
  if (active && currentSessionId) {
    ensurePort().postMessage({
      type: "PAGE_TRANSLATION_SESSION_START",
      sessionId: currentSessionId,
      translation: translationPreferences,
    });
    scheduleScan(0);
  }
  return true;
}

export function pausePageTranslation(reason: "stopped" | "cleared" | "error" = "stopped"): void {
  const jobId = currentJobId;
  const sessionId = currentSessionId;
  active = false;
  backgroundPaused = false;
  clearReconnect();
  document.removeEventListener("visibilitychange", onVisibilityChange);
  stopWatching();
  currentSessionId = null;
  currentJobId = null;
  busy = false;
  pending.clear();
  publish({ status: "paused", translatedCount: translatedCount() });
  if (!port) return;
  try {
    if (jobId) {
      port.postMessage({
        type: "PAGE_TRANSLATE_CANCEL",
        jobId,
        sessionId,
      });
    }
    if (sessionId) {
      port.postMessage({
        type: "PAGE_TRANSLATION_SESSION_END",
        sessionId,
        reason,
      });
    }
  } catch {
    port = null;
  }
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
