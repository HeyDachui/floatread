import {
  DEFAULT_TRANSLATION_PREFERENCES,
  detectTextLanguage,
  type TranslationLanguage,
  type TranslationPreferences,
} from "../translation/languages";
import {
  classifyPlatformText,
  detectPagePlatform,
  shouldSkipPlatformText,
} from "./platform-profile";

export type PageSegmentKind = "content" | "ui";

export interface PageTextSegment {
  id: string;
  text: string;
  kind: PageSegmentKind;
  node: Text;
  original: string;
  sourceLanguage: TranslationLanguage;
}

export interface PageScanResult {
  segments: PageTextSegment[];
  detectedLanguages: TranslationLanguage[];
}

const BLOCKED_SELECTOR =
  "script,style,noscript,code,pre,textarea,input,select,option,[contenteditable='true'],floatread-root";
const UI_SELECTOR =
  "nav,header,aside,footer,button,[role='button'],[role='menu'],[role='menuitem'],[role='tab'],[role='navigation'],[role='dialog'],[role='listbox'],[role='option'],[role='tooltip']";

function normalize(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function textRect(node: Text, element: HTMLElement): DOMRect {
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(node);
  const rangeWithRect = range as Range & { getBoundingClientRect?: () => DOMRect };
  const rect = rangeWithRect.getBoundingClientRect?.() ?? element.getBoundingClientRect();
  range.detach();
  return rect;
}

function isVisible(node: Text, element: HTMLElement): { visible: boolean; top: number } {
  const style = getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    (style.opacity !== "" && Number(style.opacity) === 0) ||
    (style.clipPath !== "" && style.clipPath !== "none") ||
    (style.clip !== "" && style.clip !== "auto") ||
    element.closest("[aria-hidden='true'],[hidden]")
  ) {
    return { visible: false, top: 0 };
  }
  const rect = textRect(node, element);
  if (rect.width === 0 && rect.height === 0) return { visible: false, top: rect.top };
  return {
    visible:
      rect.bottom >= 0 &&
      rect.top <= window.innerHeight &&
      rect.right >= 0 &&
      rect.left <= window.innerWidth,
    top: rect.top,
  };
}

function classify(element: HTMLElement, text: string): PageSegmentKind | null {
  const inArticle = element.closest("article");
  const inUi = element.closest(UI_SELECTOR);
  if (inArticle && !element.closest("nav,header,[role='menu'],[role='menuitem']")) {
    return text.length >= (element.closest("[lang]") ? 2 : 4) ? "content" : null;
  }
  if (inUi) return text.length <= 120 ? "ui" : null;
  if (element.closest("main,article,section") && text.length >= 12) return "content";
  return text.length >= 24 ? "content" : null;
}

export function collectVisiblePageScan(
  skipped: ReadonlySet<Text>,
  documentRef: Document = document,
  limit = 6,
  maxCharacters = 6_000,
  preferences: TranslationPreferences = DEFAULT_TRANSLATION_PREFERENCES,
): PageScanResult {
  const root = documentRef.body;
  if (!root) return { segments: [], detectedLanguages: [] };
  const platform = detectPagePlatform(documentRef.location.hostname);
  const walker = documentRef.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const candidates: Array<{ segment: PageTextSegment; top: number; order: number }> = [];
  let counter = 0;
  const detected = new Set<TranslationLanguage>();
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    current = walker.nextNode();
    if (skipped.has(node)) continue;
    const element = node.parentElement;
    if (!element || element.closest(BLOCKED_SELECTOR)) continue;
    if (shouldSkipPlatformText(platform, element)) continue;
    const original = node.nodeValue ?? "";
    const text = normalize(original);
    if (/^(?:https?:\/\/|www\.|@)[^\s]+$/iu.test(text) || text.length > 12_000) continue;
    const visibility = isVisible(node, element);
    if (!visibility.visible) continue;
    const languageContainer = element.closest("[lang]");
    const sourceLanguage = detectTextLanguage(
      text,
      languageContainer?.getAttribute("lang") ?? documentRef.documentElement.lang,
    );
    if (!sourceLanguage) continue;
    detected.add(sourceLanguage);
    if (
      sourceLanguage === preferences.targetLanguage ||
      !preferences.sourceLanguages.includes(sourceLanguage)
    )
      continue;
    const kind = classifyPlatformText(platform, element, text) ?? classify(element, text);
    if (!kind) continue;
    candidates.push({
      segment: { id: `seg_${counter}`, text, kind, node, original, sourceLanguage },
      top: visibility.top,
      order: counter,
    });
    counter += 1;
  }

  candidates.sort((left, right) => {
    const kindOrder = Number(left.segment.kind === "ui") - Number(right.segment.kind === "ui");
    if (kindOrder !== 0) return kindOrder;
    if (left.top !== right.top) return left.top - right.top;
    return left.order - right.order;
  });

  const segments: PageTextSegment[] = [];
  let characters = 0;
  for (const candidate of candidates) {
    if (segments.length >= limit) break;
    const { segment } = candidate;
    if (characters + segment.text.length > maxCharacters) {
      if (segments.length === 0 && segment.text.length <= 12_000) segments.push(segment);
      continue;
    }
    segments.push(segment);
    characters += segment.text.length;
  }
  return { segments, detectedLanguages: [...detected] };
}

export function collectVisiblePageSegments(
  skipped: ReadonlySet<Text>,
  documentRef: Document = document,
  limit = 6,
  maxCharacters = 6_000,
  preferences: TranslationPreferences = DEFAULT_TRANSLATION_PREFERENCES,
): PageTextSegment[] {
  return collectVisiblePageScan(skipped, documentRef, limit, maxCharacters, preferences).segments;
}
