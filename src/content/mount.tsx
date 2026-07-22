import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FloatingCompanion } from "../companion/FloatingCompanion";
import companionStyles from "../companion/styles.css?inline";
import { ROOT_TAG_NAME } from "../config/constants";
import { publicBootstrapSchema } from "../shared/schemas";
import type { BackgroundResponse } from "../shared/messages";
import type { PublicBootstrap } from "../shared/types";
import type { ReaderMode } from "../shared/types";

export type InitialCompanionAction =
  | { kind: "run"; text: string; mode?: ReaderMode | undefined }
  | { kind: "selection_error"; reason: "EMPTY" | "TOO_LONG"; length: number };

interface MountState {
  host: HTMLElement;
  reactRoot: Root;
}

let state: MountState | null = null;

async function requestBootstrap(): Promise<PublicBootstrap | null> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: "GET_PUBLIC_BOOTSTRAP",
    })) as BackgroundResponse;
    if (!response.ok) return null;
    const parsed = publicBootstrapSchema.safeParse(response.data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function unmountFloatRead(): void {
  state?.reactRoot.unmount();
  state?.host.remove();
  state = null;
  document.querySelector(ROOT_TAG_NAME)?.remove();
}

export async function mountFloatRead(initialAction?: InitialCompanionAction): Promise<void> {
  if (state) return;

  // An unpacked-extension reload invalidates the previous isolated world but can
  // leave its closed Shadow DOM host in the page. Remove that inert shell so the
  // new content-script instance can take ownership without requiring a page reload.
  document.querySelector(ROOT_TAG_NAME)?.remove();
  const bootstrap = await requestBootstrap();
  if (!bootstrap?.enabled) return;
  if (state) return;
  document.querySelector(ROOT_TAG_NAME)?.remove();

  const host = document.createElement(ROOT_TAG_NAME);
  host.style.position = "fixed";
  host.style.width = "0";
  host.style.height = "0";
  host.style.overflow = "visible";
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483646";

  const shadow = host.attachShadow({ mode: __FLOATREAD_SHADOW_MODE__ });
  const style = document.createElement("style");
  style.textContent = companionStyles;
  const appRoot = document.createElement("div");
  shadow.append(style, appRoot);
  document.documentElement.append(host);

  const reactRoot = createRoot(appRoot);
  state = { host, reactRoot };

  reactRoot.render(
    <StrictMode>
      <FloatingCompanion
        bootstrap={bootstrap}
        host={host}
        onHide={unmountFloatRead}
        initialAction={initialAction}
      />
    </StrictMode>,
  );
}

export function isFloatReadMounted(): boolean {
  return state !== null && state.host.isConnected;
}
