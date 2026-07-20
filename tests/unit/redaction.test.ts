import { describe, expect, it, vi } from "vitest";
import { logger, maskSecret, redactText, safeOrigin } from "../../src/security/redaction";

describe("secret redaction", () => {
  it("reveals no more than the last four characters", () => {
    expect(maskSecret("sk-example-super-secret-1234")).toBe("****1234");
    expect(redactText("Authorization: Bearer sk-example-super-secret-1234")).not.toContain(
      "super-secret",
    );
    expect(redactText("api_key=AIzaExampleSecret9876")).not.toContain("ExampleSecret");
  });

  it("logs only a bounded redacted error code", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.errorCode("NETWORK_ERROR Bearer sk-example-super-secret-1234");
    expect(consoleError).toHaveBeenCalledOnce();
    expect(String(consoleError.mock.calls[0]?.[0])).not.toContain("super-secret");
    consoleError.mockRestore();
  });

  it("removes paths, queries, and credentials from diagnostic URLs", () => {
    expect(safeOrigin("https://user:password@example.com/v1?key=secret")).toBe(
      "https://example.com",
    );
  });
});
