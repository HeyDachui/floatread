import { describe, expect, it } from "vitest";
import { parseSseData, streamUtf8Lines } from "../../src/providers/stream-parsers";

function fragmentedStream(text: string, cuts: number[]): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  let start = 0;
  const chunks = cuts.map((end) => {
    const chunk = bytes.slice(start, end);
    start = end;
    return chunk;
  });
  chunks.push(bytes.slice(start));
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

async function collect(stream: AsyncGenerator<string>): Promise<string[]> {
  const result: string[] = [];
  for await (const value of stream) result.push(value);
  return result;
}

describe("stream parsers", () => {
  it("reassembles UTF-8 code points and lines split across chunks", async () => {
    const source = "第一行\r\n第二行🙂\n尾行";
    const emojiByte = new TextEncoder().encode("第一行\r\n第二行").length + 2;
    await expect(
      collect(streamUtf8Lines(fragmentedStream(source, [1, 7, emojiByte]))),
    ).resolves.toEqual(["第一行", "第二行🙂", "尾行"]);
  });

  it("parses multiline SSE data while ignoring comments and empty events", async () => {
    const source = ': keep-alive\n\ndata: {"one":1}\ndata: {"two":2}\n\ndata: [DONE]\n\n';
    await expect(collect(parseSseData(fragmentedStream(source, [2, 9, 21, 29])))).resolves.toEqual([
      '{"one":1}\n{"two":2}',
      "[DONE]",
    ]);
  });
});
