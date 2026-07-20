import type { ReaderMode } from "../shared/types";
import { validateSelectedText } from "../content/selection-manager";
import { injectAndSend } from "./injection";

const PARENT_ID = "floatread-selection";
const MODE_BY_MENU_ID: Record<string, ReaderMode> = {
  "floatread-natural-zh": "natural_zh",
  "floatread-key-points": "key_points",
  "floatread-explain-terms": "explain_terms",
};

export function contextMenuMode(menuItemId: string | number): ReaderMode | null {
  return MODE_BY_MENU_ID[String(menuItemId)] ?? null;
}

export async function createContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();
  const message = (key: string, fallback: string): string =>
    chrome.i18n?.getMessage(key) || fallback;
  chrome.contextMenus.create({
    id: PARENT_ID,
    title: message("contextMenuParent", "FloatRead 浮读"),
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "floatread-natural-zh",
    parentId: PARENT_ID,
    title: message("contextMenuNatural", "自然中文"),
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "floatread-key-points",
    parentId: PARENT_ID,
    title: message("contextMenuPoints", "看懂重点"),
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "floatread-explain-terms",
    parentId: PARENT_ID,
    title: message("contextMenuTerms", "解释术语"),
    contexts: ["selection"],
  });
}

export function registerContextMenuClicks(): void {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const mode = contextMenuMode(info.menuItemId);
    if (!mode || !tab) return;
    const selection = validateSelectedText(info.selectionText ?? "");
    void injectAndSend(
      tab,
      selection.valid
        ? { type: "RUN_SELECTION", mode, text: selection.text }
        : { type: "SHOW_SELECTION_ERROR", reason: selection.reason, length: selection.length },
    ).catch(() => undefined);
  });
}
