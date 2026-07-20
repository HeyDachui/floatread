import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FloatingCompanion } from "../companion/FloatingCompanion";
import companionStyles from "../companion/styles.css?inline";
import { ROOT_TAG_NAME } from "../config/constants";
import { publicBootstrapSchema } from "../shared/schemas";
import type { BackgroundResponse } from "../shared/messages";
import type { PublicBootstrap } from "../shared/types";

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

export async function mountFloatRead(): Promise<void> {
  if (state || document.querySelector(ROOT_TAG_NAME)) return;
  const bootstrap = await requestBootstrap();
  if (!bootstrap?.enabled) return;

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

  const handleModeSelected = (): void => {
    if (!bootstrap.providerConfigured) {
      void chrome.runtime.sendMessage({ type: "OPEN_OPTIONS", section: "provider" });
    }
  };

  reactRoot.render(
    <StrictMode>
      <FloatingCompanion
        bootstrap={bootstrap}
        host={host}
        onHide={unmountFloatRead}
        onModeSelected={handleModeSelected}
      />
    </StrictMode>,
  );
}

export function isFloatReadMounted(): boolean {
  return state !== null && state.host.isConnected;
}
