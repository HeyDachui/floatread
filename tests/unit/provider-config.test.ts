import { afterEach, describe, expect, it, vi } from "vitest";
import { createProviderProfile, validateProviderUrl } from "../../src/providers/config";
import {
  deleteProviderSecret,
  getProviderSecret,
  saveProviderSecret,
} from "../../src/storage/secrets";

interface MemoryArea {
  values: Record<string, unknown>;
  area: chrome.storage.StorageArea;
}

function createMemoryArea(): MemoryArea {
  const values: Record<string, unknown> = {};
  const area = {
    get: vi.fn(async (key: string) => ({ [key]: values[key] })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(values, items);
    }),
  } as unknown as chrome.storage.StorageArea;
  return { values, area };
}

afterEach(() => vi.unstubAllGlobals());

describe("Provider configuration security", () => {
  it("allows HTTPS remote origins and exact loopback Ollama origins", () => {
    const remote = validateProviderUrl(createProviderProfile("openai"));
    expect(remote).toMatchObject({
      valid: true,
      permission: "https://api.openai.com/*",
    });
    const ollama = createProviderProfile("ollama");
    ollama.baseUrl = "http://127.0.0.1:11434";
    expect(validateProviderUrl(ollama)).toMatchObject({
      valid: true,
      permission: "http://127.0.0.1:11434/*",
    });
  });

  it.each([
    ["openai", "http://api.example.com/v1"],
    ["openai_compatible", "https://user:pass@example.com/v1"],
    ["anthropic", "https://example.com/v1?secret=x"],
    ["gemini", "https://example.com/v1#fragment"],
    ["ollama", "http://192.168.1.2:11434"],
  ] as const)("rejects unsafe %s Base URL %s", (kind, baseUrl) => {
    const value = createProviderProfile(kind);
    value.baseUrl = baseUrl;
    expect(validateProviderUrl(value).valid).toBe(false);
  });

  it("keeps local and session secrets separate and deletes both", async () => {
    const local = createMemoryArea();
    const session = createMemoryArea();
    vi.stubGlobal("chrome", { storage: { local: local.area, session: session.area } });

    await saveProviderSecret("profile-local", "local", " local-secret ");
    await saveProviderSecret("profile-session", "session", " session-secret ");
    await saveProviderSecret("profile-memory", "prompt_each_time", " memory-secret ");

    await expect(getProviderSecret("profile-local", "local")).resolves.toBe("local-secret");
    await expect(getProviderSecret("profile-session", "session")).resolves.toBe("session-secret");
    await expect(getProviderSecret("profile-memory", "prompt_each_time")).resolves.toBe(
      "memory-secret",
    );
    expect(local.values).not.toEqual(session.values);

    await deleteProviderSecret("profile-local");
    await deleteProviderSecret("profile-session");
    await deleteProviderSecret("profile-memory");
    await expect(getProviderSecret("profile-local", "local")).resolves.toBeUndefined();
    await expect(getProviderSecret("profile-session", "session")).resolves.toBeUndefined();
    await expect(getProviderSecret("profile-memory", "prompt_each_time")).resolves.toBeUndefined();
  });
});
