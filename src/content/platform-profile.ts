import type { PageSegmentKind } from "./page-scanner";

export type PagePlatform = "x" | "ted" | "reddit" | "generic";

export function detectPagePlatform(hostname: string): PagePlatform {
  const normalized = hostname.toLowerCase().replace(/\.$/u, "");
  if (normalized === "x.com" || normalized.endsWith(".x.com") || normalized === "twitter.com")
    return "x";
  if (normalized === "ted.com" || normalized.endsWith(".ted.com")) return "ted";
  if (normalized === "reddit.com" || normalized.endsWith(".reddit.com")) return "reddit";
  return "generic";
}

export function shouldSkipPlatformText(platform: PagePlatform, element: HTMLElement): boolean {
  if (platform !== "ted") return false;
  return Boolean(
    element.closest(
      "video,track,[aria-live='polite'],[aria-live='assertive'],[role='timer'],[role='progressbar'],[role='log']",
    ),
  );
}

export function classifyPlatformText(
  platform: PagePlatform,
  element: HTMLElement,
  text: string,
): PageSegmentKind | undefined {
  if (platform === "x") {
    if (
      element.closest("article,[role='article']") &&
      !element.closest("nav,header,[role='menu'],[role='menuitem']")
    )
      return text.length >= 2 ? "content" : undefined;
    return undefined;
  }
  if (platform === "reddit") {
    if (
      element.closest("article,[role='article'],blockquote") &&
      !element.closest("nav,header,[role='menu'],[role='menuitem']")
    )
      return text.length >= 2 ? "content" : undefined;
    return undefined;
  }
  if (platform === "ted") {
    if (
      element.closest("main,[role='main']") &&
      element.closest("h1,h2,h3,h4,p,blockquote,[role='heading']")
    )
      return text.length >= 2 ? "content" : undefined;
    return undefined;
  }
  return undefined;
}
