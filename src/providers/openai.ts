import {
  assertProfile,
  requireResponseBody,
  requireText,
  runConnectionTest,
  validateProfile,
} from "./adapter-utils";
import { endpoint } from "./config";
import { assertOk, providerFetch, readJsonResponse, requireApiKey } from "./http";
import { nestedString, parseJsonRecord, parseSseData } from "./stream-parsers";
import type {
  ProviderAdapter,
  ProviderCompletion,
  ProviderProfile,
  ProviderRequest,
  ProviderStreamEvent,
} from "./types";

function requestInit(
  request: ProviderRequest,
  profile: ProviderProfile,
  apiKey: string | undefined,
  signal: AbortSignal,
  stream: boolean,
): RequestInit {
  return {
    method: "POST",
    headers: {
      authorization: `Bearer ${requireApiKey(apiKey)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: profile.model,
      instructions: request.systemPrompt,
      input: request.userPrompt,
      max_output_tokens: request.maxOutputTokens,
      store: false,
      stream,
    }),
    signal,
  };
}

function responseOutputText(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const output = (value as Record<string, unknown>).output;
  if (!Array.isArray(output)) return undefined;
  const chunks: string[] = [];
  for (const item of output) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part !== "object" || part === null || Array.isArray(part)) continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.length > 0 ? chunks.join("") : undefined;
}

function tokenCount(value: unknown, name: string): number | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const usage = (value as Record<string, unknown>).usage;
  if (typeof usage !== "object" || usage === null || Array.isArray(usage)) return undefined;
  const count = (usage as Record<string, unknown>)[name];
  return typeof count === "number" ? count : undefined;
}

export const openAiAdapter: ProviderAdapter = {
  kind: "openai",
  validateConfig: (profile) =>
    profile.kind === "openai"
      ? validateProfile(profile)
      : {
          valid: false,
          error: {
            code: "INVALID_PROVIDER_CONFIG",
            message: "Provider 类型不匹配。",
            retryable: false,
          },
        },
  testConnection: (profile, apiKey, signal) =>
    runConnectionTest(openAiAdapter, profile, apiKey, signal),
  complete: async (request, profile, apiKey, signal): Promise<ProviderCompletion> => {
    assertProfile(openAiAdapter, profile);
    const response = await providerFetch(
      endpoint(profile.baseUrl, "responses"),
      requestInit(request, profile, apiKey, signal, false),
    );
    await assertOk(response);
    const record = await readJsonResponse(response);
    return {
      text: requireText(responseOutputText(record)),
      inputTokens: tokenCount(record, "input_tokens"),
      outputTokens: tokenCount(record, "output_tokens"),
    };
  },
  stream: async function* (request, profile, apiKey, signal): AsyncGenerator<ProviderStreamEvent> {
    assertProfile(openAiAdapter, profile);
    const response = await providerFetch(
      endpoint(profile.baseUrl, "responses"),
      requestInit(request, profile, apiKey, signal, true),
    );
    await assertOk(response);
    yield { type: "start" };
    for await (const data of parseSseData(requireResponseBody(response))) {
      if (data === "[DONE]") break;
      const record = parseJsonRecord(data);
      if (record.type === "response.output_text.delta") {
        const delta = typeof record.delta === "string" ? record.delta : undefined;
        if (delta) yield { type: "delta", text: delta };
      }
      if (record.type === "response.completed") {
        const responseValue = record.response;
        yield {
          type: "usage",
          inputTokens: tokenCount(responseValue, "input_tokens"),
          outputTokens: tokenCount(responseValue, "output_tokens"),
        };
      }
      if (record.type === "response.failed" || record.type === "error") {
        throw new Error(nestedString(record, ["error", "message"]) ?? "OpenAI stream failed");
      }
    }
    yield { type: "done" };
  },
};
