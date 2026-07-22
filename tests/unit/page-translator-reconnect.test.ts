import { afterEach, describe, expect, it, vi } from "vitest";

interface FakePort {
  postMessage: ReturnType<typeof vi.fn>;
  messageListeners: Array<(message: unknown, port: chrome.runtime.Port) => void>;
  disconnectListeners: Array<(port: chrome.runtime.Port) => void>;
}

function fakePort(): FakePort & chrome.runtime.Port {
  const messageListeners: Array<(message: unknown, port: chrome.runtime.Port) => void> = [];
  const disconnectListeners: Array<(port: chrome.runtime.Port) => void> = [];
  return {
    name: "floatread-page-translation",
    postMessage: vi.fn(),
    disconnect: vi.fn(),
    messageListeners,
    disconnectListeners,
    onMessage: {
      addListener: (listener: (message: unknown, port: chrome.runtime.Port) => void) =>
        messageListeners.push(listener),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false),
      hasListeners: vi.fn(() => messageListeners.length > 0),
    },
    onDisconnect: {
      addListener: (listener: (port: chrome.runtime.Port) => void) =>
        disconnectListeners.push(listener),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false),
      hasListeners: vi.fn(() => disconnectListeners.length > 0),
    },
  } as unknown as FakePort & chrome.runtime.Port;
}

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});

describe("page translator connection recovery", () => {
  it("reconnects a transiently disconnected active page and preserves its session id", async () => {
    vi.useFakeTimers();
    const first = fakePort();
    const second = fakePort();
    const connect = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    vi.stubGlobal("chrome", { runtime: { connect } });
    const translator = await import("../../src/content/page-translator");

    translator.startPageTranslation();
    const firstStart = first.postMessage.mock.calls[0]?.[0] as {
      type: string;
      sessionId: string;
    };
    expect(firstStart.type).toBe("PAGE_TRANSLATION_SESSION_START");

    first.disconnectListeners[0]?.(first);
    expect(translator.getPageTranslationState().status).toBe("scanning");
    await vi.advanceTimersByTimeAsync(500);

    expect(connect).toHaveBeenCalledTimes(2);
    expect(second.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PAGE_TRANSLATION_SESSION_START",
        sessionId: firstStart.sessionId,
      }),
    );
    expect(translator.getPageTranslationState().status).not.toBe("error");
    translator.pausePageTranslation();
  });

  it("stops after three rapid disconnects instead of reconnecting forever", async () => {
    vi.useFakeTimers();
    const first = fakePort();
    const second = fakePort();
    const third = fakePort();
    const connect = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(third);
    vi.stubGlobal("chrome", { runtime: { connect } });
    const translator = await import("../../src/content/page-translator");

    translator.startPageTranslation();
    first.disconnectListeners[0]?.(first);
    await vi.advanceTimersByTimeAsync(500);
    second.disconnectListeners[0]?.(second);
    await vi.advanceTimersByTimeAsync(1_000);
    third.disconnectListeners[0]?.(third);

    expect(connect).toHaveBeenCalledTimes(3);
    expect(translator.getPageTranslationState()).toEqual(
      expect.objectContaining({
        status: "error",
        message: "页面翻译连接已断开，自动恢复失败，请重试。",
      }),
    );
    await vi.advanceTimersByTimeAsync(10_000);
    expect(connect).toHaveBeenCalledTimes(3);
  });

  it("submits no new batch while hidden and resumes when the page returns", async () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 40,
      width: 400,
      height: 40,
      toJSON: () => ({}),
    });
    const connected = fakePort();
    vi.stubGlobal("chrome", { runtime: { connect: vi.fn(() => connected) } });
    const translator = await import("../../src/content/page-translator");

    translator.startPageTranslation();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    document.body.innerHTML =
      '<main><p lang="en">This hidden page must not submit another batch.</p></main>';
    await vi.advanceTimersByTimeAsync(5_000);
    expect(
      connected.postMessage.mock.calls.filter(
        ([message]) => (message as { type?: string }).type === "PAGE_TRANSLATE_BATCH",
      ),
    ).toHaveLength(0);
    expect(translator.getPageTranslationState().status).toBe("background_paused");

    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(
      connected.postMessage.mock.calls.filter(
        ([message]) => (message as { type?: string }).type === "PAGE_TRANSLATE_BATCH",
      ),
    ).toHaveLength(1);
    translator.pausePageTranslation();
  });

  it("updates to paused immediately even when the translation Port is already dead", async () => {
    const connected = fakePort();
    connected.postMessage
      .mockImplementationOnce(() => undefined)
      .mockImplementation(() => {
        throw new Error("Attempting to use a disconnected port object");
      });
    vi.stubGlobal("chrome", { runtime: { connect: vi.fn(() => connected) } });
    const translator = await import("../../src/content/page-translator");

    translator.startPageTranslation();
    expect(() => translator.pausePageTranslation()).not.toThrow();
    expect(translator.getPageTranslationState().status).toBe("paused");
  });
});
