import { assertOk, providerFetch, readJsonResponse, requireApiKey } from "./http";
import { endpoint } from "./config";
import {
  assertProfile,
  requireResponseBody,
  requireText,
  runConnectionTest,
  validateProfile,
} from "./adapter-utils";
import { nestedString, parseJsonRecord, parseSseData } from "./stream-parsers";
import type {
  ProviderAdapter,
  ProviderCompletion,
  ProviderKind,
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
  kind: ProviderKind,
): RequestInit {
  return {
    method: "POST",
    headers: {
      authorization: `Bearer ${requireApiKey(apiKey)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: profile.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      max_tokens: request.maxOutputTokens,
      ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
      ...(request.responseFormat === "json_object"
        ? { response_format: { type: "json_object" } }
        : {}),
      ...(kind === "deepseek" ? { thinking: { type: "disabled" } } : {}),
      ...(stream && kind === "deepseek" ? { stream_options: { include_usage: true } } : {}),
      stream,
    }),
    signal,
  };
}

function usage(record: Record<string, unknown>): ProviderStreamEvent | undefined {
  const value = record.usage;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  return {
    type: "usage",
    inputTokens: typeof item.prompt_tokens === "number" ? item.prompt_tokens : undefined,
    outputTokens: typeof item.completion_tokens === "number" ? item.completion_tokens : undefined,
  };
}

export function createOpenAiCompatibleAdapter(
  kind: "openai_compatible" | "deepseek",
): ProviderAdapter {
  const adapter: ProviderAdapter = {
    kind,
    validateConfig: (profile) =>
      profile.kind === kind
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
      runConnectionTest(adapter, profile, apiKey, signal),
    complete: async (request, profile, apiKey, signal): Promise<ProviderCompletion> => {
      assertProfile(adapter, profile);
      const response = await providerFetch(
        endpoint(profile.baseUrl, "chat/completions"),
        requestInit(request, profile, apiKey, signal, false, adapter.kind),
      );
      await assertOk(response);
      const record = await readJsonResponse(response);
      const text = requireText(nestedString(record, ["choices", 0, "message", "content"]));
      const recordObject =
        typeof record === "object" && record !== null ? (record as Record<string, unknown>) : {};
      const usageEvent = usage(recordObject);
      return {
        text,
        inputTokens: usageEvent?.type === "usage" ? usageEvent.inputTokens : undefined,
        outputTokens: usageEvent?.type === "usage" ? usageEvent.outputTokens : undefined,
      };
    },
    stream: async function* (
      request,
      profile,
      apiKey,
      signal,
    ): AsyncGenerator<ProviderStreamEvent> {
      assertProfile(adapter, profile);
      const response = await providerFetch(
        endpoint(profile.baseUrl, "chat/completions"),
        requestInit(request, profile, apiKey, signal, true, adapter.kind),
      );
      await assertOk(response);
      yield { type: "start" };
      let sawDone = false;
      for await (const data of parseSseData(requireResponseBody(response))) {
        if (data === "[DONE]") {
          sawDone = true;
          break;
        }
        const record = parseJsonRecord(data);
        const text = nestedString(record, ["choices", 0, "delta", "content"]);
        if (text) yield { type: "delta", text };
        const usageEvent = usage(record);
        if (usageEvent) yield usageEvent;
      }
      if (!sawDone) {
        // Some compatible endpoints close the stream instead of sending [DONE].
      }
      yield { type: "done" };
    },
  };
  return adapter;
}

export const openAiCompatibleAdapter = createOpenAiCompatibleAdapter("openai_compatible");
export const deepSeekAdapter = createOpenAiCompatibleAdapter("deepseek");

export const OPENAI_COMPATIBLE_KINDS: ProviderKind[] = ["openai_compatible", "deepseek"];
