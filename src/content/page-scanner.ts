export type PageSegmentKind = "content" | "ui";

export interface PageTextSegment {
  id: string;
  text: string;
  kind: PageSegmentKind;
  node: Text;
  original: string;
}

const BLOCKED_SELECTOR =
  "script,style,noscript,code,pre,textarea,input,select,option,[contenteditable='true'],floatread-root";
const UI_SELECTOR =
  "nav,header,aside,footer,button,[role='button'],[role='menu'],[role='menuitem'],[role='tab'],[role='navigation'],[role='dialog'],[role='listbox'],[role='option'],[role='tooltip']";

function normalize(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function looksEnglish(value: string): boolean {
  if (/^(?:https?:\/\/|www\.|@)[^\s]+$/iu.test(value)) return false;
  const latin = value.match(/[A-Za-z]/gu)?.length ?? 0;
  const han = value.match(/[\u3400-\u9fff]/gu)?.length ?? 0;
  if (han === 0) return latin >= 2 && latin / Math.max(1, value.length) >= 0.12;
  return latin >= 8 && latin / (latin + han) >= 0.6;
}

function isVisible(element: HTMLElement, viewportMargin: number): boolean {
  const style = getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    (style.opacity !== "" && Number(style.opacity) === 0)
  ) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return (
    rect.bottom >= -viewportMargin &&
    rect.top <= window.innerHeight + viewportMargin &&
    rect.right >= 0 &&
    rect.left <= window.innerWidth
  );
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

export function collectVisiblePageSegments(
  skipped: ReadonlySet<Text>,
  documentRef: Document = document,
  limit = 12,
  maxCharacters = 12_000,
): PageTextSegment[] {
  const root = documentRef.body;
  if (!root) return [];
  const walker = documentRef.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segments: PageTextSegment[] = [];
  let characters = 0;
  let counter = 0;
  let current = walker.nextNode();
  while (current && segments.length < limit) {
    const node = current as Text;
    current = walker.nextNode();
    if (skipped.has(node)) continue;
    const element = node.parentElement;
    if (!element || element.closest(BLOCKED_SELECTOR)) continue;
    const original = node.nodeValue ?? "";
    const text = normalize(original);
    if (!looksEnglish(text) || text.length > 12_000 || !isVisible(element, 280)) continue;
    const kind = classify(element, text);
    if (!kind || characters + text.length > maxCharacters) continue;
    segments.push({ id: `seg_${counter++}`, text, kind, node, original });
    characters += text.length;
  }
  return segments;
}
