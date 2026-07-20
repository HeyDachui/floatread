import { backgroundToContentSchema } from "../shared/messages";
import { clearLastResult, copyLastResult } from "./last-result";
import { isFloatReadMounted, mountFloatRead, unmountFloatRead } from "./mount";
import { readSelectedText, validateSelectedText } from "./selection-manager";

type FloatReadGlobal = typeof globalThis & {
  __FLOATREAD_CONTENT_INSTALLED__?: true;
};

const floatReadGlobal = globalThis as FloatReadGlobal;

if (window.top === window && !floatReadGlobal.__FLOATREAD_CONTENT_INSTALLED__) {
  floatReadGlobal.__FLOATREAD_CONTENT_INSTALLED__ = true;

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const parsed = backgroundToContentSchema.safeParse(message);
    if (!parsed.success) return;
    switch (parsed.data.type) {
      case "SHOW_COMPANION":
        void mountFloatRead().then(() => sendResponse({ visible: isFloatReadMounted() }));
        return true;
      case "HIDE_COMPANION":
        unmountFloatRead();
        clearLastResult();
        break;
      case "TOGGLE_COMPANION":
        if (isFloatReadMounted()) {
          unmountFloatRead();
          clearLastResult();
        } else void mountFloatRead();
        break;
      case "REFRESH_COMPANION":
        unmountFloatRead();
        void mountFloatRead().then(() => sendResponse({ visible: isFloatReadMounted() }));
        return true;
      case "GET_COMPANION_STATUS":
        sendResponse({ visible: isFloatReadMounted() });
        break;
      case "RUN_SELECTION": {
        const validation = validateSelectedText(parsed.data.text ?? readSelectedText());
        if (!validation.valid) {
          unmountFloatRead();
          void mountFloatRead();
          break;
        }
        unmountFloatRead();
        void mountFloatRead({
          kind: "run",
          text: validation.text,
          mode: parsed.data.mode,
        }).then(() => sendResponse({ visible: isFloatReadMounted() }));
        return true;
      }
      case "SHOW_SELECTION_ERROR":
        unmountFloatRead();
        void mountFloatRead({
          kind: "selection_error",
          reason: parsed.data.reason,
          length: parsed.data.length,
        }).then(() => sendResponse({ visible: isFloatReadMounted() }));
        return true;
      case "COPY_LAST_RESULT":
        void copyLastResult();
        break;
    }
  });

  void mountFloatRead();
}
