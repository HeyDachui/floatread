import {
  PAGE_TRANSLATION_PORT_NAME,
  pageTranslationPortOutgoingSchema,
  type PageTranslationPortOutgoing,
} from "../shared/messages";
import { collectVisiblePageSegments, type PageTextSegment } from "./page-scanner";

export type PageTranslationState =
  | { status: "idle"; translatedCount: number }
  | { status: "scanning" | "translating" | "watching"; translatedCount: number }
  | { status: "paused"; translatedCount: number }
  | { status: "error"; translatedCount: number; message: string };

interface AppliedTranslation {
  original: string;
  translation: string;
}

let state: PageTranslationState = { status: "idle", translatedCount: 0 };
let active = false;
let busy = false;
let port: chrome.runtime.Port | null = null;
let currentJobId: string | null = null;
let observer: MutationObserver | null = null;
let scheduleTimer: ReturnType<typeof setTimeout> | undefined;
const applied = new Map<Text, AppliedTranslation>();
const pending = new Map<string, PageTextSegment>();
const listeners = new Set<(value: PageTranslationState) => void>();

function publish(next: PageTranslationState): void {
  state = next;
  for (const listener of listeners) listener(next);
}

function translatedCount(): number {
  for (const [node, record] of applied) {
    if (!node.isConnected || node.nodeValue !== record.translation) applied.delete(node);
  }
  return applied.size;
}

function ensurePort(): chrome.runtime.Port {
  if (port) return port;
  port = chrome.runtime.connect({ name: PAGE_TRANSLATION_PORT_NAME });
  port.onMessage.addListener((rawMessage: unknown) => {
    const parsed = pageTranslationPortOutgoingSchema.safeParse(rawMessage);
    if (parsed.success) handleEvent(parsed.data);
  });
  port.onDisconnect.addListener(() => {
    port = null;
    if (active) {
      active = false;
      busy = false;
      publish({
        status: "error",
        translatedCount: translatedCount(),
        message: "页面翻译连接已断开，请重试。",
      });
      stopWatching();
    }
  });
  return port;
}

function handleEvent(event: PageTranslationPortOutgoing): void {
  if (event.jobId !== currentJobId || !active) return;
  if (event.type === "PAGE_SEGMENT_RESULT") {
    const segment = pending.get(event.id);
    if (!segment || !segment.node.isConnected) return;
    if ((segment.node.nodeValue ?? "").trim() !== segment.text) return;
    segment.node.nodeValue = event.text;
    applied.set(segment.node, { original: segment.text, translation: event.text });
    publish({ status: "translating", translatedCount: translatedCount() });
    return;
  }
  if (event.type === "PAGE_BATCH_ERROR") {
    pending.clear();
    busy = false;
    active = false;
    currentJobId = null;
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
      scheduleScan(80);
    } else publish({ status: "paused", translatedCount: translatedCount() });
  }
}

function skippedNodes(): Set<Text> {
  return new Set([...applied.keys(), ...[...pending.values()].map((segment) => segment.node)]);
}

function scan(): void {
  scheduleTimer = undefined;
  if (!active || busy) return;
  publish({ status: "scanning", translatedCount: translatedCount() });
  const segments = collectVisiblePageSegments(skippedNodes());
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
    segments: segments.map(({ id, text, kind }) => ({ id, text, kind })),
  });
}

function scheduleScan(delay = 260): void {
  if (!active) return;
  if (scheduleTimer) clearTimeout(scheduleTimer);
  scheduleTimer = setTimeout(scan, delay);
}

const onViewportChange = (): void => scheduleScan(180);

function startWatching(): void {
  if (!observer && document.body) {
    observer = new MutationObserver(() => scheduleScan());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
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

export function startPageTranslation(): void {
  if (active) return;
  active = true;
  startWatching();
  publish({ status: "scanning", translatedCount: translatedCount() });
  scheduleScan(0);
}

export function pausePageTranslation(): void {
  active = false;
  stopWatching();
  if (currentJobId) {
    ensurePort().postMessage({ type: "PAGE_TRANSLATE_CANCEL", jobId: currentJobId });
  }
  currentJobId = null;
  busy = false;
  pending.clear();
  publish({ status: "paused", translatedCount: translatedCount() });
}

export function clearPageTranslation(): void {
  pausePageTranslation();
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
