# FloatRead development progress

This file is the auditable project status source. A phase is only marked complete after its stated checks have actually run and its commit exists.

## Current status

- Current phase: Phase 4 — complete; Phase 3 real-Provider smoke remains pending user confirmation
- Workspace boundary: this repository root
- Repository status: independent Git repository initialized on `main`
- Product specification: `docs/source/FloatRead_Codex_Development_Spec_V1.md`
- Local smoke-test secret: `.secrets/FloatRead-APIKEY.txt` (ignored; contents unread)
- Real API status: preflight eligible; waiting for confirmation that the ignored key is a DeepSeek key

## Phase ledger

| Phase | Status             | Commit                                     | Verification                                                                     |
| ----- | ------------------ | ------------------------------------------ | -------------------------------------------------------------------------------- |
| 0     | Complete           | `6573a7680abb5b7573b1d58deb64f159f1ed7a3b` | Lint, typecheck, unit, integration, build and dist verification passed           |
| 1     | Complete           | `be39d18ee6fbdb9bd61ec496ba945097c5274829` | 11 unit tests and 2 real Chromium extension E2E tests passed                     |
| 2     | Complete           | `bcaa587ca3cdb7e60da4c8b5330c6062313ffa23` | 23 unit, 2 integration and 4 real extension E2E tests passed                     |
| 3     | Preflight complete | `26bdd909c753b4d1f13270b8f9d8f3becab9306e` | 51 unit, 2 integration and 5 real extension E2E tests passed; real smoke pending |
| 4     | Complete           | This phase commit (see Git log)            | 59 unit, 2 integration and 6 real extension E2E tests passed                     |
| 5     | Not started        | —                                          | —                                                                                |
| 6     | Not started        | —                                          | —                                                                                |
| 7     | Not started        | —                                          | —                                                                                |

## Phase 0 target

- Initialize the independent repository and pnpm toolchain.
- Establish strict TypeScript, ESLint, Vitest, Playwright and Vite build configuration.
- Produce a valid MV3 build with popup, options, onboarding, service worker and closed-Shadow-DOM content entry.
- Record architecture, decisions, source provenance, threat model and workspace scope.

## Important decisions

- All project mutations are confined to this independent repository root.
- The nested repository avoids mixing FloatRead commits with unrelated parent-workspace material.
- The local API credential stays under ignored `.secrets/`; it is not read before the real-provider checkpoint.
- Version follows the specification: `0.1.0`.
- License follows the specification: MIT.
- Brand links use centralized replaceable defaults until the publisher supplies final identities.
- Production Shadow DOM is compiled as `closed`; E2E builds may compile it as `open`.

## Knowledge and process record

- Knowledge Before query: no configured FloatRead project entry (`no_relevant_hit`).
- Adoption decision: no external local knowledge card adopted; current specification, official Chrome documentation and executable tests are authoritative for this repository.
- Knowledge After at Phase 0: `not_applied`; there was no candidate to adopt. The pnpm 11 build-script approval behavior is recorded as project-local operational evidence rather than promoted to shared knowledge.
- Next After checkpoint: each material project milestone.

## Phase 0 verification

| Command                 | Actual result                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm install`          | Passed after explicitly allowing only the required `esbuild` install script in `pnpm-workspace.yaml` |
| `pnpm lint`             | Passed with zero warnings                                                                            |
| `pnpm typecheck`        | Passed                                                                                               |
| `pnpm test`             | Passed: 1 file, 1 test                                                                               |
| `pnpm test:integration` | Passed: 1 file, 1 test                                                                               |
| `pnpm build`            | Passed; MV3 files emitted to `dist/`                                                                 |
| `pnpm verify:dist`      | Passed; 13 files verified                                                                            |
| `pnpm package`          | Passed; development checkpoint ZIP generated locally                                                 |

### Phase 0 controlled failure

The first dependency installation downloaded packages but exited with `ERR_PNPM_IGNORED_BUILDS` because pnpm 11 blocked the `esbuild` postinstall script. A deprecated package-level setting was rejected on the second attempt. The final fix uses the pnpm 11 workspace-level `allowBuilds` setting and approves only `esbuild`; installation then passed.

## Known issues

- Brand identity and public repository URLs are provisional centralized values.
- Provider, cache and skin code belongs to later phases.
- No real API call is authorized before the explicit smoke-test checkpoint.

## Phase 1 result

Implemented:

- Idempotent top-frame Content Script with a single `floatread-root`.
- Production closed Shadow DOM and separate open-Shadow E2E build.
- Trusted bootstrap messaging; Content cannot read `chrome.storage.local`.
- Normalized DOM/Input/Textarea selection capture, password exclusion, debounce and 120-second expiry.
- Floating instrument UI with keyboard focus, light/dark compatibility and reduced-motion behavior.
- Pointer drag threshold, viewport clamp, left/right snap and `edge + yRatio` persistence.
- Current-page hide, settings entry and position reset controls.
- User-gesture programmatic injection through `activeTab + scripting` for the shortcut path.

Verification:

| Command                     | Actual result                                         |
| --------------------------- | ----------------------------------------------------- |
| `pnpm lint`                 | Passed                                                |
| `pnpm typecheck`            | Passed                                                |
| `pnpm test`                 | Passed: 4 files, 11 tests                             |
| `pnpm test:integration`     | Passed: 1 file, 1 test                                |
| `pnpm build:e2e`            | Passed; isolated E2E extension emitted to `dist-e2e/` |
| `pnpm exec playwright test` | Passed: 2 real Chromium extension tests               |

Controlled E2E failure and fix:

- First run: two timeouts while waiting for the root node.
- Root cause: the independently bundled React Content Script retained `process.env.NODE_ENV`, which is unavailable in the browser isolated world.
- Fix: compile `process.env.NODE_ENV` to `"production"` for Content and Background bundles.
- Recheck: both layout-isolation and selection/drag tests passed; temporary storage diagnostics were removed.

## Phase 2 result

Implemented:

- Prompt-versioned, mode-specific instructions for natural Chinese, key points and term explanation.
- Explicit prompt-injection boundary: selected content is untrusted JSON data and cannot close its source delimiter.
- Runtime-validated generation port protocol with no credential fields.
- Background-owned request lifecycle, per-tab concurrency guard, global concurrency limit and `AbortController` cancellation.
- Development/E2E-only deterministic Mock Provider with chunked streaming; production builds compile the branch out.
- Reducer-driven reader state machine that ignores stale request events and preserves partial output after cancellation.
- Edge-aware, internally scrolling result panel with mode switch, original text, stop, retry, copy and structured errors.
- Pure-text model output rendering, keyboard close behavior, reduced-motion loading treatment and light/dark tokens.

Verification:

| Command                 | Actual result                           |
| ----------------------- | --------------------------------------- |
| `pnpm lint`             | Passed with zero warnings               |
| `pnpm typecheck`        | Passed                                  |
| `pnpm test`             | Passed: 7 files, 23 tests               |
| `pnpm test:integration` | Passed: 2 files, 2 tests                |
| `pnpm build`            | Passed; production Mock branch removed  |
| `pnpm verify:dist`      | Passed; 13 production files verified    |
| `pnpm test:e2e`         | Passed: 4 real Chromium extension tests |

Controlled E2E failure and fix:

- First Phase 2 E2E run: two tests timed out looking for mode menu items.
- Root cause: the tests clicked before the intentional 150 ms selection debounce had updated accessible readiness; this was a test synchronization error, not a product timeout.
- Fix: wait on the companion's user-visible ready label before clicking. The complete E2E suite then passed.

Knowledge After at Phase 2: `not_applied` for prior knowledge cards. New local evidence retained here: extension E2E must synchronize on user-visible selection readiness because the product intentionally debounces `selectionchange`; production verification now proves that Mock result strings are absent from release JavaScript.

## Next phase

Phase 3 preflight is complete. The user has been asked to confirm whether the ignored credential file belongs to DeepSeek before one minimal smoke test uses `https://api.deepseek.com` and `deepseek-v4-flash`. Work that does not require the credential can continue into Phase 4 while this answer is pending.

## Phase 3 preflight result

Implemented:

- Six independent adapters behind one Provider Router: OpenAI Responses, OpenAI Compatible, DeepSeek, Anthropic Messages, Gemini Generate Content and Ollama Chat.
- Ordinary completions and incremental SSE/NDJSON streaming with fragmented UTF-8 handling.
- Background-only request construction, exact-origin permission checks and safe Base URL validation.
- `AbortController` cancellation, per-profile timeout, status mapping and at most one automatic retry before any output is emitted.
- Versioned Zod Provider profiles stored separately from credentials.
- Session (recommended), local and prompt-each-time credential repositories; deletion clears all three locations.
- Trusted-extension-only Provider management messages. The public Content protocol still rejects URL, header and credential fields.
- Settings UI for profiles, editable model/Base URL, risk warnings, exact host authorization, minimal connection test and credential clearing.
- Central redaction helpers that expose no more than four trailing credential characters and reduce URLs to their origin.

Verification:

| Command                 | Actual result                                             |
| ----------------------- | --------------------------------------------------------- |
| `pnpm lint`             | Passed with zero warnings                                 |
| `pnpm typecheck`        | Passed                                                    |
| `pnpm test`             | Passed: 11 files, 51 tests                                |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                  |
| `pnpm build`            | Passed; 14 production files emitted                       |
| `pnpm verify:dist`      | Passed; Mock code absent and release constraints verified |
| `pnpm test:e2e`         | Passed: 5 real Chromium extension tests                   |

The E2E settings test verifies a password input, session-only save, no key re-display after reload, persistent-storage risk disclosure and rejection of remote HTTP Base URLs.

Real API checkpoint:

- Proposed Provider: DeepSeek.
- Proposed Base URL: `https://api.deepseek.com`.
- Proposed model: `deepseek-v4-flash`.
- Secret source: ignored `.secrets/FloatRead-APIKEY.txt`; file contents remain unread pending Provider confirmation.
- No real request has been made and no credential has been echoed.

Knowledge After at Phase 3: `not_applied` for prior local knowledge cards. Current primary Provider documentation and executable adapter tests were used directly. Project-local evidence retained: Provider protocols need separate framing parsers (SSE versus NDJSON), and retries are safe only before a text delta is exposed.

## Phase 4 result

Implemented:

- Stable SHA-256 keys over normalized text, reading mode, Provider kind, Base URL, model and Prompt version.
- Versioned result records with byte size, creation, last-access and expiry timestamps; no credential field exists in the schema.
- Persistent IndexedDB cache and browser-session cache using separate trusted storage.
- TTL cleanup, LRU access updates, maximum entry and byte budgets, oversized-result refusal and full clear.
- Corrupt-record isolation: malformed entries are deleted without blocking generation or extension startup.
- Background integration that checks cache before host permission or Provider fetch and writes only successful complete output.
- Settings migration from the known V0 shape to V1, future-version rejection and corrupted-settings fallback.
- Settings UI for cache location, TTL, entry limit, capacity, usage display and clear action.

Verification:

| Command                 | Actual result                           |
| ----------------------- | --------------------------------------- |
| `pnpm lint`             | Passed with zero warnings               |
| `pnpm typecheck`        | Passed                                  |
| `pnpm test`             | Passed: 13 files, 59 tests              |
| `pnpm test:integration` | Passed: 2 files, 2 tests                |
| `pnpm build`            | Passed; 14 production files emitted     |
| `pnpm verify:dist`      | Passed                                  |
| `pnpm test:e2e`         | Passed: 6 real Chromium extension tests |

The cache E2E uses a unique selected passage, confirms the first result is not marked cached, repeats the same request, and confirms the second result carries the cache marker from the pre-Provider return path.

Controlled E2E failure and fix:

- Adding cache settings introduced two accessible controls whose names contained “保存”, then two containing “持久保存在本机”. Playwright correctly rejected ambiguous locators.
- Tests now target the exact **保存** button and credential-storage radio role. All six E2E tests pass.

Knowledge After at Phase 4: `not_applied` for prior knowledge cards. New project-local evidence retained: semantic cache keys must include Provider origin as well as kind/model, and damaged individual records should be deleted at read time rather than invalidating the whole database.

## Next phase after the API checkpoint

Phase 5 will implement the versioned six-skin engine, runtime design tokens, live switching and hardened `.floatread-skin` import/export. The pending one-Provider smoke test will be recorded separately as soon as the user confirms the credential's Provider.
