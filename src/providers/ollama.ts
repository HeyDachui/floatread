import {
  assertProfile,
  requireResponseBody,
  requireText,
  runConnectionTest,
  validateProfile,
} from "./adapter-utils";
import { endpoint } from "./config";
import { assertOk, providerFetch, readJsonResponse } from "./http";
import { nestedString, parseJsonRecord, streamUtf8Lines } from "./stream-parsers";
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
  signal: AbortSignal,
  stream: boolean,
): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: profile.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      stream,
      think: false,
      options: {
        num_predict: request.maxOutputTokens,
        ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
      },
    }),
    signal,
  };
}

export const ollamaAdapter: ProviderAdapter = {
  kind: "ollama",
  validateConfig: (profile) =>
    profile.kind === "ollama"
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
    runConnectionTest(ollamaAdapter, profile, apiKey, signal),
  complete: async (request, profile, _apiKey, signal): Promise<ProviderCompletion> => {
    assertProfile(ollamaAdapter, profile);
    const response = await providerFetch(
      endpoint(profile.baseUrl, "api/chat"),
      requestInit(request, profile, signal, false),
    );
    await assertOk(response);
    const record = await readJsonResponse(response);
    return { text: requireText(nestedString(record, ["message", "content"])) };
  },
  stream: async function* (request, profile, _apiKey, signal): AsyncGenerator<ProviderStreamEvent> {
    assertProfile(ollamaAdapter, profile);
    const response = await providerFetch(
      endpoint(profile.baseUrl, "api/chat"),
      requestInit(request, profile, signal, true),
    );
    await assertOk(response);
    yield { type: "start" };
    for await (const line of streamUtf8Lines(requireResponseBody(response))) {
      if (!line.trim()) continue;
      const record = parseJsonRecord(line);
      const text = nestedString(record, ["message", "content"]);
      if (text) yield { type: "delta", text };
    }
    yield { type: "done" };
  },
};
