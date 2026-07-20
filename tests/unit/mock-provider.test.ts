import { describe, expect, it } from "vitest";
import { streamMockResult } from "../../src/providers/mock";

async function collect(stream: AsyncGenerator<string>): Promise<string> {
  let result = "";
  for await (const chunk of stream) result += chunk;
  return result;
}

describe("Mock Provider", () => {
  it("streams the deterministic acceptance text", async () => {
    const output = await collect(
      streamMockResult(
        "natural_zh",
        "We reset usage limits for affected Codex users.",
        new AbortController().signal,
      ),
    );
    expect(output).toBe("我们已重置受影响的 Codex 用户的使用限额。");
  });

  it("stops streaming when aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      collect(streamMockResult("key_points", "Source", controller.signal)),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
