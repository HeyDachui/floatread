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
      "x-api-key": requireApiKey(apiKey),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: profile.model,
      system: request.systemPrompt,
      messages: [{ role: "user", content: request.userPrompt }],
      max_tokens: request.maxOutputTokens,
      stream,
    }),
    signal,
  };
}

function completionText(record: unknown): string | undefined {
  if (typeof record !== "object" || record === null || Array.isArray(record)) return undefined;
  const content = (record as Record<string, unknown>).content;
  if (!Array.isArray(content)) return undefined;
  return content
    .map((item) =>
      typeof item === "object" && item !== null && !Array.isArray(item)
        ? (item as Record<string, unknown>).text
        : undefined,
    )
    .filter((text): text is string => typeof text === "string")
    .join("");
}

function usageNumber(record: unknown, key: string): number | undefined {
  if (typeof record !== "object" || record === null || Array.isArray(record)) return undefined;
  const usage = (record as Record<string, unknown>).usage;
  if (typeof usage !== "object" || usage === null || Array.isArray(usage)) return undefined;
  const value = (usage as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

export const anthropicAdapter: ProviderAdapter = {
  kind: "anthropic",
  validateConfig: (profile) =>
    profile.kind === "anthropic"
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
    runConnectionTest(anthropicAdapter, profile, apiKey, signal),
  complete: async (request, profile, apiKey, signal): Promise<ProviderCompletion> => {
    assertProfile(anthropicAdapter, profile);
    const response = await providerFetch(
      endpoint(profile.baseUrl, "messages"),
      requestInit(request, profile, apiKey, signal, false),
    );
    await assertOk(response);
    const record = await readJsonResponse(response);
    return {
      text: requireText(completionText(record)),
      inputTokens: usageNumber(record, "input_tokens"),
      outputTokens: usageNumber(record, "output_tokens"),
    };
  },
  stream: async function* (request, profile, apiKey, signal): AsyncGenerator<ProviderStreamEvent> {
    assertProfile(anthropicAdapter, profile);
    const response = await providerFetch(
      endpoint(profile.baseUrl, "messages"),
      requestInit(request, profile, apiKey, signal, true),
    );
    await assertOk(response);
    yield { type: "start" };
    for await (const data of parseSseData(requireResponseBody(response))) {
      const record = parseJsonRecord(data);
      if (record.type === "content_block_delta") {
        const text = nestedString(record, ["delta", "text"]);
        if (text) yield { type: "delta", text };
      }
      if (record.type === "error") throw new Error("Anthropic stream failed");
    }
    yield { type: "done" };
  },
};
