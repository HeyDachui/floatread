import { describe, expect, it } from "vitest";
import {
  classifyPlatformText,
  detectPagePlatform,
  shouldSkipPlatformText,
} from "../../src/content/platform-profile";

describe("page platform profiles", () => {
  it("recognizes only the selected platform families", () => {
    expect(detectPagePlatform("x.com")).toBe("x");
    expect(detectPagePlatform("www.ted.com")).toBe("ted");
    expect(detectPagePlatform("old.reddit.com")).toBe("reddit");
    expect(detectPagePlatform("example.com")).toBe("generic");
    expect(detectPagePlatform("notreddit.com")).toBe("generic");
  });

  it("treats short Reddit posts and X article text as content without private selectors", () => {
    document.body.innerHTML = `
      <article><h2 id="reddit-title">AI news</h2></article>
      <article><p id="x-post">New model</p></article>
    `;
    expect(
      classifyPlatformText(
        "reddit",
        document.querySelector("#reddit-title") as HTMLElement,
        "AI news",
      ),
    ).toBe("content");
    expect(
      classifyPlatformText("x", document.querySelector("#x-post") as HTMLElement, "New model"),
    ).toBe("content");
  });

  it("includes TED learning-page copy but excludes live captions and timers", () => {
    document.body.innerHTML = `
      <main><h1 id="talk-title">A better way to learn</h1></main>
      <div aria-live="polite"><span id="caption">Live spoken words</span></div>
      <span role="timer" id="timer">00:12</span>
    `;
    expect(
      classifyPlatformText(
        "ted",
        document.querySelector("#talk-title") as HTMLElement,
        "A better way to learn",
      ),
    ).toBe("content");
    expect(shouldSkipPlatformText("ted", document.querySelector("#caption") as HTMLElement)).toBe(
      true,
    );
    expect(shouldSkipPlatformText("ted", document.querySelector("#timer") as HTMLElement)).toBe(
      true,
    );
  });
});
