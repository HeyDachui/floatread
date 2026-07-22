import { afterEach, describe, expect, it, vi } from "vitest";
import { createGenerationClient } from "../../src/content/generation-client";

interface FakePort {
  postMessage: ReturnType<typeof vi.fn>;
  messageListeners: Array<(message: unknown, port: chrome.runtime.Port) => void>;
  disconnectListeners: Array<(port: chrome.runtime.Port) => void>;
}

function fakePort(): FakePort & chrome.runtime.Port {
  const messageListeners: Array<(message: unknown, port: chrome.runtime.Port) => void> = [];
  const disconnectListeners: Array<(port: chrome.runtime.Port) => void> = [];
  return {
    name: "floatread-generation-v1",
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
  vi.unstubAllGlobals();
});

describe("precision generation client", () => {
  it("surfaces a disconnected active request and reconnects on retry", () => {
    const first = fakePort();
    const second = fakePort();
    const connect = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    vi.stubGlobal("chrome", { runtime: { connect } });
    const onEvent = vi.fn();
    const client = createGenerationClient(onEvent);

    client.start("request-first", "Source text", "natural_zh");
    first.disconnectListeners[0]?.(first);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "STREAM_ERROR",
        requestId: "request-first",
        error: expect.objectContaining({ retryable: true }),
      }),
    );

    client.start("request-retry", "Source text", "natural_zh");
    expect(connect).toHaveBeenCalledTimes(2);
    expect(second.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GENERATE_START", requestId: "request-retry" }),
    );
    client.dispose();
  });

  it("never throws when Stop is pressed after the Port has died", () => {
    const dead = fakePort();
    dead.postMessage
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error("Attempting to use a disconnected port object");
      });
    vi.stubGlobal("chrome", { runtime: { connect: vi.fn(() => dead) } });
    const client = createGenerationClient(vi.fn());

    client.start("request-stop", "Source text", "natural_zh");
    expect(() => client.cancel("request-stop")).not.toThrow();
    client.dispose();
  });
});
