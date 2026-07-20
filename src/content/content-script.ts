import { ROOT_TAG_NAME } from "../config/constants";

function mountRoot(): void {
  if (window.top !== window || document.querySelector(ROOT_TAG_NAME)) {
    return;
  }

  const host = document.createElement(ROOT_TAG_NAME);
  host.style.position = "fixed";
  host.style.width = "0";
  host.style.height = "0";
  host.style.overflow = "visible";
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483646";
  host.attachShadow({ mode: __FLOATREAD_SHADOW_MODE__ });
  document.documentElement.append(host);
}

mountRoot();
