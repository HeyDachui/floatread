import {
  assertProfile,
  requireResponseBody,
  requireText,
  runConnectionTest,
  validateProfile,
} from "./adapter-utils";
import { endpoint } from "./config";
import { assertOk, providerFetch, readJsonResponse, requireApiKey } from "./http";
import { parseJsonRecord, parseSseData } from "./stream-parsers";
import type {
  ProviderAdapter,
  ProviderCompletion,
  ProviderProfile,
  ProviderRequest,
  ProviderStreamEvent,
} from "./types";

function geminiUrl(profile: ProviderProfile, stream: boolean): string {
  const method = stream ? "streamGenerateContent?alt=sse" : "generateContent";
  return endpoint(profile.baseUrl, `models/${encodeURIComponent(profile.model)}:${method}`);
}

function requestInit(
  request: ProviderRequest,
  apiKey: string | undefined,
  signal: AbortSignal,
): RequestInit {
  return {
    method: "POST",
    headers: { "x-goog-api-key": requireApiKey(apiKey), "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: request.userPrompt }] }],
      generationConfig: {
        maxOutputTokens: request.maxOutputTokens,
        ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
      },
    }),
    signal,
  };
}

function responseText(record: unknown): string | undefined {
  if (typeof record !== "object" || record === null || Array.isArray(record)) return undefined;
  const candidates = (record as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates)) return undefined;
  const chunks: string[] = [];
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    const candidate = candidates[candidateIndex];
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) continue;
    const content = (candidate as Record<string, unknown>).content;
    if (typeof content !== "object" || content === null || Array.isArray(content)) continue;
    const parts = (content as Record<string, unknown>).parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (typeof part !== "object" || part === null || Array.isArray(part)) continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.length > 0 ? chunks.join("") : undefined;
}

function usageNumber(record: unknown, key: string): number | undefined {
  if (typeof record !== "object" || record === null || Array.isArray(record)) return undefined;
  const usage = (record as Record<string, unknown>).usageMetadata;
  if (typeof usage !== "object" || usage === null || Array.isArray(usage)) return undefined;
  const value = (usage as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

export const geminiAdapter: ProviderAdapter = {
  kind: "gemini",
  validateConfig: (profile) =>
    profile.kind === "gemini"
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
    runConnectionTest(geminiAdapter, profile, apiKey, signal),
  complete: async (request, profile, apiKey, signal): Promise<ProviderCompletion> => {
    assertProfile(geminiAdapter, profile);
    const response = await providerFetch(
      geminiUrl(profile, false),
      requestInit(request, apiKey, signal),
    );
    await assertOk(response);
    const record = await readJsonResponse(response);
    return {
      text: requireText(responseText(record)),
      inputTokens: usageNumber(record, "promptTokenCount"),
      outputTokens: usageNumber(record, "candidatesTokenCount"),
    };
  },
  stream: async function* (request, profile, apiKey, signal): AsyncGenerator<ProviderStreamEvent> {
    assertProfile(geminiAdapter, profile);
    const response = await providerFetch(
      geminiUrl(profile, true),
      requestInit(request, apiKey, signal),
    );
    await assertOk(response);
    yield { type: "start" };
    for await (const data of parseSseData(requireResponseBody(response))) {
      const record = parseJsonRecord(data);
      const text = responseText(record);
      if (text) yield { type: "delta", text };
      const inputTokens = usageNumber(record, "promptTokenCount");
      const outputTokens = usageNumber(record, "candidatesTokenCount");
      if (inputTokens !== undefined || outputTokens !== undefined) {
        yield { type: "usage", inputTokens, outputTokens };
      }
    }
    yield { type: "done" };
  },
};

export const extractGeminiText = responseText;
