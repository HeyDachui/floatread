# Provider architecture

FloatRead sends model requests directly from its Manifest V3 Background Service Worker to the Provider selected by the user. The Content Script can submit runtime-validated precision-reading requests or bounded page-translation segments after the user enables translation for that origin. It cannot choose a URL, headers, model, system prompt or credentials, and it cannot read credentials.

## Adapter matrix

| Kind              | Protocol                | Default Base URL                                   | Authentication                      | Stream format                    |
| ----------------- | ----------------------- | -------------------------------------------------- | ----------------------------------- | -------------------------------- |
| OpenAI            | Responses API           | `https://api.openai.com/v1`                        | Bearer header                       | SSE `response.output_text.delta` |
| OpenAI Compatible | Chat Completions        | User supplied                                      | Bearer header                       | SSE `choices[].delta.content`    |
| DeepSeek          | Chat Completions preset | `https://api.deepseek.com`                         | Bearer header                       | SSE `choices[].delta.content`    |
| Anthropic         | Messages API            | `https://api.anthropic.com/v1`                     | `x-api-key` plus API-version header | SSE `content_block_delta`        |
| Gemini            | Generate Content        | `https://generativelanguage.googleapis.com/v1beta` | `x-goog-api-key`                    | Generate Content SSE             |
| Ollama            | Chat API                | `http://localhost:11434`                           | None by default                     | NDJSON                           |

Model names shown in the UI are editable examples, not a promise that a model will always exist. FloatRead sends no tool definitions and enables no search, grounding, file access, MCP or remote action capability. OpenAI requests set `store: false`.

DeepSeek V4 defaults to Thinking mode, where reasoning tokens count against `max_tokens` before final `content`. FloatRead explicitly sends `thinking: { type: "disabled" }` because its three concise reading modes do not need exposed chain-of-thought; this also avoids an empty final answer under a small output budget.

## Permission boundary

Remote Providers must use HTTPS. Ollama V1 accepts only `localhost` and `127.0.0.1`, including a custom port. Base URLs containing embedded credentials, a query string or a fragment are rejected. The settings page explains and requests only the parsed Provider origin before a user-triggered connection test. A denied permission produces a normal, recoverable error.

## Credential modes

- `session` is recommended and uses `chrome.storage.session`.
- `local` uses `chrome.storage.local` after an explicit risk warning.
- `prompt_each_time` keeps the submitted value only in current Service Worker memory.

Local and session storage are restricted to trusted extension contexts. Provider profiles never contain API keys. Deleting a Provider or pressing **Clear credentials** removes the corresponding key from local, session and memory stores. Saved keys are never returned to the settings page, Content Script, cache or exports.

Browser client storage is not a hardware vault. Use an independent, low-limit, revocable key; users with higher security requirements should prefer local Ollama or a local proxy they control.

## Primary protocol references

- [OpenAI Responses streaming](https://platform.openai.com/docs/api-reference/responses-streaming)
- [Anthropic streaming Messages](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Gemini Generate Content](https://ai.google.dev/api/generate-content)
- [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion)
- [Ollama Chat API](https://docs.ollama.com/api/chat)
