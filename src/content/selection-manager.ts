import { MAX_SELECTION_LENGTH } from "../config/constants";

const ALLOWED_INPUT_TYPES = new Set(["text", "search", "email", "url", "tel"]);
const SELECTION_TTL_MS = 120_000;
const SELECTION_DEBOUNCE_MS = 150;

export interface SelectionSnapshot {
  text: string;
  expiresAt: number;
}

export type SelectionValidation =
  { valid: true; text: string } | { valid: false; reason: "EMPTY" | "TOO_LONG"; length: number };

export function normalizeSelectedText(value: string): string {
  return value.normalize("NFC").replace(/\r\n?/gu, "\n").trim();
}

export function validateSelectedText(value: string): SelectionValidation {
  const text = normalizeSelectedText(value);
  if (text.length === 0) return { valid: false, reason: "EMPTY", length: 0 };
  if (text.length > MAX_SELECTION_LENGTH) {
    return { valid: false, reason: "TOO_LONG", length: text.length };
  }
  return { valid: true, text };
}

function readTextControlSelection(element: Element): string | null {
  if (element instanceof HTMLInputElement) {
    if (!ALLOWED_INPUT_TYPES.has(element.type.toLowerCase())) return null;
  } else if (!(element instanceof HTMLTextAreaElement)) {
    return null;
  }

  const start = element.selectionStart;
  const end = element.selectionEnd;
  if (start === null || end === null || start === end) return null;
  return element.value.slice(Math.min(start, end), Math.max(start, end));
}

export function readSelectedText(
  documentRef: Document = document,
  windowRef: Window = window,
): string {
  const activeSelection = documentRef.activeElement
    ? readTextControlSelection(documentRef.activeElement)
    : null;
  if (activeSelection !== null) return normalizeSelectedText(activeSelection);
  return normalizeSelectedText(windowRef.getSelection()?.toString() ?? "");
}

export interface SelectionManager {
  captureNow(): SelectionSnapshot | null;
  getCurrent(): SelectionSnapshot | null;
  clear(): void;
  destroy(): void;
}

export function createSelectionManager(
  onChange: (selection: SelectionSnapshot | null) => void,
  documentRef: Document = document,
  windowRef: Window = window,
  now: () => number = Date.now,
): SelectionManager {
  let current: SelectionSnapshot | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;

  const clearTimers = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (expiryTimer) clearTimeout(expiryTimer);
    debounceTimer = undefined;
    expiryTimer = undefined;
  };

  const clear = (): void => {
    clearTimers();
    current = null;
    onChange(null);
  };

  const captureNow = (): SelectionSnapshot | null => {
    const validation = validateSelectedText(readSelectedText(documentRef, windowRef));
    if (!validation.valid) {
      if (current && current.expiresAt <= now()) clear();
      return current;
    }
    if (expiryTimer) clearTimeout(expiryTimer);
    current = { text: validation.text, expiresAt: now() + SELECTION_TTL_MS };
    onChange(current);
    expiryTimer = setTimeout(clear, SELECTION_TTL_MS);
    return current;
  };

  const scheduleCapture = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(captureNow, SELECTION_DEBOUNCE_MS);
  };

  documentRef.addEventListener("selectionchange", scheduleCapture, { passive: true });

  return {
    captureNow,
    getCurrent: () => {
      if (current && current.expiresAt <= now()) clear();
      return current;
    },
    clear,
    destroy: () => {
      clearTimers();
      documentRef.removeEventListener("selectionchange", scheduleCapture);
      current = null;
    },
  };
}
