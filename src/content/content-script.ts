import { backgroundToContentSchema } from "../shared/messages";
import { isFloatReadMounted, mountFloatRead, unmountFloatRead } from "./mount";

type FloatReadGlobal = typeof globalThis & {
  __FLOATREAD_CONTENT_INSTALLED__?: true;
};

const floatReadGlobal = globalThis as FloatReadGlobal;

if (window.top === window && !floatReadGlobal.__FLOATREAD_CONTENT_INSTALLED__) {
  floatReadGlobal.__FLOATREAD_CONTENT_INSTALLED__ = true;

  chrome.runtime.onMessage.addListener((message: unknown) => {
    const parsed = backgroundToContentSchema.safeParse(message);
    if (!parsed.success) return;
    switch (parsed.data.type) {
      case "SHOW_COMPANION":
        void mountFloatRead();
        break;
      case "HIDE_COMPANION":
        unmountFloatRead();
        break;
      case "TOGGLE_COMPANION":
        if (isFloatReadMounted()) unmountFloatRead();
        else void mountFloatRead();
        break;
      case "REFRESH_COMPANION":
        unmountFloatRead();
        void mountFloatRead();
        break;
    }
  });

  void mountFloatRead();
}
