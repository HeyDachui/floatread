# Provider configuration

All actual Provider traffic originates in the Background Service Worker. UI and Content modules never contain Provider fetch logic or receive saved keys.

## Supported adapters

| Provider          | Default Base URL                                   | Example model       | Normal | Streaming | Credential      |
| ----------------- | -------------------------------------------------- | ------------------- | ------ | --------- | --------------- |
| OpenAI            | `https://api.openai.com/v1`                        | `gpt-5-mini`        | Yes    | SSE       | API key         |
| OpenAI Compatible | User supplied HTTPS URL                            | `your-model-name`   | Yes    | SSE       | API key         |
| DeepSeek          | `https://api.deepseek.com`                         | `deepseek-v4-flash` | Yes    | SSE       | API key         |
| Anthropic Claude  | `https://api.anthropic.com/v1`                     | `claude-sonnet-4-5` | Yes    | SSE       | API key         |
| Google Gemini     | `https://generativelanguage.googleapis.com/v1beta` | `gemini-2.5-flash`  | Yes    | SSE       | API key         |
| Ollama            | `http://localhost:11434`                           | `gemma3`            | Yes    | NDJSON    | None by default |

Example model names are editable and can become unavailable; verify them with the Provider. Custom endpoints should normally use OpenAI Compatible Chat Completions.

DeepSeek V4 requests explicitly disable Thinking mode. FloatRead needs only a concise reading result, and DeepSeek counts thinking plus final-answer tokens within the same output limit.

## Setup

1. Open the toolbar Popup and choose **Settings**.
2. Choose the AI service and model. DeepSeek is listed first as the recommended simple default.
3. Choose session (recommended), local persistent, or enter-each-time credential handling.
4. Use **Save** to keep the configuration without a network request, or **Save and test** to request the exact origin permission and run one minimal connection check.
5. Open **Advanced settings** only when the service address or the default 30-second timeout needs to change.

Remote endpoints must use HTTPS. URLs containing a username, password, query or fragment are rejected. Errors for HTTP 400/401/403/404/408/429/5xx, timeout, abort, malformed response and network failure are normalized. Automatic retry happens at most once and only before output has begun.

## Ollama

1. Install and run Ollama locally.
2. Pull the model you intend to use, for example `ollama pull gemma3`.
3. Select Ollama in FloatRead and keep `http://localhost:11434` unless your local port differs.
4. Enter the exact local model name and grant the localhost permission.
5. Test the connection.

V1 accepts Ollama only on `localhost` or `127.0.0.1`. If browser access is blocked by the local service's origin policy, configure Ollama for extension access according to its current official documentation; do not expose it to an untrusted network.

## Prompt safety

Each reading mode builds a fixed system instruction. Selected text is encoded as untrusted data, never treated as system instructions. Adapters define no tools, search, grounding, file access or external context. Model output is assistance, not independently verified fact.

Protocol details and official references are in [PROVIDER_ARCHITECTURE.md](PROVIDER_ARCHITECTURE.md).
