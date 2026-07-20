import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSelectionManager,
  normalizeSelectedText,
  readSelectedText,
  validateSelectedText,
} from "../../src/content/selection-manager";

afterEach(() => {
  document.body.replaceChildren();
  window.getSelection()?.removeAllRanges();
  vi.useRealTimers();
});

describe("selection manager", () => {
  it("normalizes Unicode and line endings", () => {
    expect(normalizeSelectedText("  Cafe\u0301\r\nline  ")).toBe("Café\nline");
  });

  it("reads selected text from textarea controls", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "before selected after";
    document.body.append(textarea);
    textarea.focus();
    textarea.setSelectionRange(7, 15);
    expect(readSelectedText()).toBe("selected");
  });

  it("never reads password input selections", () => {
    const input = document.createElement("input");
    input.type = "password";
    input.value = "private-value";
    document.body.append(input);
    input.focus();
    input.setSelectionRange(0, input.value.length);
    expect(readSelectedText()).toBe("");
  });

  it("rejects empty and oversized selections without truncating", () => {
    expect(validateSelectedText("  ")).toEqual({ valid: false, reason: "EMPTY", length: 0 });
    const oversized = "a".repeat(12_001);
    expect(validateSelectedText(oversized)).toEqual({
      valid: false,
      reason: "TOO_LONG",
      length: 12_001,
    });
  });

  it("retains the latest valid selection and expires it after 120 seconds", () => {
    vi.useFakeTimers();
    let now = 1_000;
    const paragraph = document.createElement("p");
    paragraph.textContent = "Keep this selection";
    document.body.append(paragraph);
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    window.getSelection()?.addRange(range);
    const updates: Array<string | null> = [];
    const manager = createSelectionManager(
      (selection) => updates.push(selection?.text ?? null),
      document,
      window,
      () => now,
    );

    expect(manager.captureNow()?.text).toBe("Keep this selection");
    window.getSelection()?.removeAllRanges();
    expect(manager.captureNow()?.text).toBe("Keep this selection");
    now += 120_001;
    expect(manager.getCurrent()).toBeNull();
    expect(updates.at(-1)).toBeNull();
    manager.destroy();
  });
});
