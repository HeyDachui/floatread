import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { anthropicAdapter } from "../../src/providers/anthropic";
import { createProviderProfile } from "../../src/providers/config";
import { geminiAdapter } from "../../src/providers/gemini";
import { mapHttpError } from "../../src/providers/http";
import { ollamaAdapter } from "../../src/providers/ollama";
import { openAiAdapter } from "../../src/providers/openai";
import { deepSeekAdapter, openAiCompatibleAdapter } from "../../src/providers/openai-compatible";
import { streamWithSingleRetry } from "../../src/providers/router";
import type {
  ProviderAdapter,
  ProviderProfile,
  ProviderRequest,
  ProviderStreamEvent,
} from "../../src/providers/types";

const REQUEST: ProviderRequest = {
  requestId: "request-provider-test",
  systemPrompt: "System boundary",
  userPrompt: "Untrusted source JSON",
  maxOutputTokens: 32,
};

function profile(kind: ProviderProfile["kind"]): ProviderProfile {
  return { ...createProviderProfile(kind, 100), id: "profile-12345678" };
}

function streamResponse(body: string, cuts: number[] = []): Response {
  const encoded = new TextEncoder().encode(body);
  let start = 0;
  const chunks = cuts.map((end) => {
    const chunk = encoded.slice(start, end);
    start = end;
    return chunk;
  });
  chunks.push(encoded.slice(start));
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    { status: 200 },
  );
}

async function collect(
  stream: AsyncGenerator<ProviderStreamEvent>,
): Promise<ProviderStreamEvent[]> {
  const events: ProviderStreamEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

function fetchMock(response: Response): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

afterEach(() => vi.unstubAllGlobals());

describe("Provider adapters", () => {
  it("uses OpenAI Responses with store disabled and parses text deltas", async () => {
    const fetcher = fetchMock(
      streamResponse(
        'data: {"type":"response.output_text.delta","delta":"你"}\n\n' +
          'data: {"type":"response.output_text.delta","delta":"好"}\n\n' +
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":4,"output_tokens":2}}}\n\n',
        [3, 51, 92],
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const events = await collect(
      openAiAdapter.stream(
        REQUEST,
        profile("openai"),
        "sk-example-not-real",
        new AbortController().signal,
      ),
    );
    expect(events.filter((event) => event.type === "delta")).toEqual([
      { type: "delta", text: "你" },
      { type: "delta", text: "好" },
    ]);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ store: false, stream: true, instructions: "System boundary" });
    expect(body).not.toHaveProperty("tools");
  });

  it("supports OpenAI-compatible ordinary responses", async () => {
    const fetcher = fetchMock(
      Response.json({
        choices: [{ message: { content: "普通返回" } }],
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await openAiCompatibleAdapter.complete(
      REQUEST,
      profile("openai_compatible"),
      "sk-example-not-real",
      new AbortController().signal,
    );
    expect(result).toEqual({ text: "普通返回", inputTokens: 5, outputTokens: 3 });
    const [, init] = fetcher.mock.calls[0] ?? [];
    expect(init?.headers).toMatchObject({ authorization: "Bearer sk-example-not-real" });
  });

  it("routes DeepSeek independently and explicitly disables thinking", async () => {
    expect(deepSeekAdapter.kind).toBe("deepseek");
    expect(deepSeekAdapter.validateConfig(profile("deepseek"))).toEqual({ valid: true });
    expect(openAiCompatibleAdapter.validateConfig(profile("deepseek")).valid).toBe(false);
    const fetcher = fetchMock(Response.json({ choices: [{ message: { content: "OK" } }] }));
    vi.stubGlobal("fetch", fetcher);
    await deepSeekAdapter.complete(
      { ...REQUEST, responseFormat: "json_object" },
      profile("deepseek"),
      "sk-example-not-real",
      new AbortController().signal,
    );
    const [, init] = fetcher.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
    });
  });

  it("requests token usage while streaming DeepSeek page output", async () => {
    const fetcher = fetchMock(
      streamResponse(
        'data: {"choices":[{"delta":{"content":"{\\"translations\\":[]}"}}],"usage":{"prompt_tokens":9,"completion_tokens":4}}\n\n' +
          "data: [DONE]\n\n",
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const events = await collect(
      deepSeekAdapter.stream(
        { ...REQUEST, responseFormat: "json_object" },
        profile("deepseek"),
        "sk-example-not-real",
        new AbortController().signal,
      ),
    );
    expect(events).toContainEqual({ type: "usage", inputTokens: 9, outputTokens: 4 });
    const [, init] = fetcher.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      stream: true,
      stream_options: { include_usage: true },
    });
  });

  it("uses Anthropic Messages headers and text delta events", async () => {
    const fetcher = fetchMock(
      streamResponse(
        'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Claude"}}\n\n' +
          'event: message_stop\ndata: {"type":"message_stop"}\n\n',
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const events = await collect(
      anthropicAdapter.stream(
        REQUEST,
        profile("anthropic"),
        "sk-ant-example-not-real",
        new AbortController().signal,
      ),
    );
    expect(events).toContainEqual({ type: "delta", text: "Claude" });
    const [, init] = fetcher.mock.calls[0] ?? [];
    expect(init?.headers).toMatchObject({
      "x-api-key": "sk-ant-example-not-real",
      "anthropic-version": "2023-06-01",
    });
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("tools");
  });

  it("uses Gemini systemInstruction and extracts streamed candidate text", async () => {
    const fetcher = fetchMock(
      streamResponse('data: {"candidates":[{"content":{"parts":[{"text":"Gemini"}]}}]}\n\n'),
    );
    vi.stubGlobal("fetch", fetcher);
    const events = await collect(
      geminiAdapter.stream(
        REQUEST,
        profile("gemini"),
        "gemini-example-not-real",
        new AbortController().signal,
      ),
    );
    expect(events).toContainEqual({ type: "delta", text: "Gemini" });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toContain(":streamGenerateContent?alt=sse");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "gemini-example-not-real" });
    expect(JSON.parse(String(init?.body))).toHaveProperty("systemInstruction");
  });

  it("parses Ollama NDJSON and never adds authorization", async () => {
    const fetcher = fetchMock(
      streamResponse(
        '{"message":{"content":"Olla"},"done":false}\n' +
          '{"message":{"content":"ma"},"done":true}\n',
        [7, 53],
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const events = await collect(
      ollamaAdapter.stream(REQUEST, profile("ollama"), undefined, new AbortController().signal),
    );
    expect(events.filter((event) => event.type === "delta")).toEqual([
      { type: "delta", text: "Olla" },
      { type: "delta", text: "ma" },
    ]);
    const [, init] = fetcher.mock.calls[0] ?? [];
    expect(init?.headers).not.toHaveProperty("authorization");
  });

  it.each([
    [400, "INVALID_PROVIDER_CONFIG"],
    [401, "INVALID_API_KEY"],
    [403, "FORBIDDEN"],
    [404, "MODEL_NOT_FOUND"],
    [408, "TIMEOUT"],
    [429, "RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
  ] as const)("maps HTTP %i to %s", (status, code) => {
    expect(mapHttpError(status).code).toBe(code);
  });

  it("retries a 429 once, then succeeds", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(
        streamResponse('data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: [DONE]\n\n'),
      );
    vi.stubGlobal("fetch", fetcher);
    const events = await collect(
      streamWithSingleRetry(
        REQUEST,
        profile("deepseek"),
        "sk-example-not-real",
        new AbortController().signal,
      ),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(events).toContainEqual({ type: "delta", text: "OK" });
  });

  it("never retries more than once", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      collect(
        streamWithSingleRetry(
          REQUEST,
          profile("deepseek"),
          "sk-example-not-real",
          new AbortController().signal,
        ),
      ),
    ).rejects.toMatchObject({ publicError: { code: "RATE_LIMITED" } });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("passes cancellation to fetch without retrying", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      controller.abort();
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return new Response();
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(
      collect(openAiAdapter.stream(REQUEST, profile("openai"), "sk-example", controller.signal)),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

expectTypeOf(openAiAdapter).toMatchTypeOf<ProviderAdapter>();
