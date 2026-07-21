# FloatRead development progress

This file is the auditable project status source. A phase is only marked complete after its stated checks have actually run and its commit exists.

## Current status

- Current phase: V2 page-translation redesign — automated release complete; manual X acceptance pending
- Workspace boundary: this repository root
- Repository status: independent Git repository initialized on `main`
- Product specification: `docs/source/FloatRead_Codex_Development_Spec_V1.md`
- Local smoke-test secret: `.secrets/FloatRead-APIKEY.txt` (ignored; read only into a temporary process environment for the authorized test)
- Real API status: DeepSeek `deepseek-v4-flash` connection, ordinary, stream and cancel passed

## Phase ledger

| Phase | Status   | Commit                                     | Verification                                                                    |
| ----- | -------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| 0     | Complete | `6573a7680abb5b7573b1d58deb64f159f1ed7a3b` | Lint, typecheck, unit, integration, build and dist verification passed          |
| 1     | Complete | `be39d18ee6fbdb9bd61ec496ba945097c5274829` | 11 unit tests and 2 real Chromium extension E2E tests passed                    |
| 2     | Complete | `bcaa587ca3cdb7e60da4c8b5330c6062313ffa23` | 23 unit, 2 integration and 4 real extension E2E tests passed                    |
| 3     | Complete | `26bdd909c753b4d1f13270b8f9d8f3becab9306e` | Automated checks plus post-Phase-7 authorized DeepSeek smoke passed             |
| 4     | Complete | `0cf1f92bb2ee206f581b817c21bf13e5e93dfdeb` | 59 unit, 2 integration and 6 real extension E2E tests passed                    |
| 5     | Complete | `80ee9636f1025bdd6b3791ae028738b184f600fa` | 79 unit, 2 integration and 7 real extension E2E tests passed                    |
| 6     | Complete | `f93405f843fbf2b1b47f47cbc027ec900214ef66` | 90 unit, 2 integration and 13 real extension E2E tests passed                   |
| 7     | Complete | `2b4c95624715b0ff2715bb5532a29002bb75f212` | Full quality gate, audit, dist/ZIP verification and secret scans passed         |
| V2    | Complete | `c69fec0c2822455e5b9e1dadd8404ceb01031898` | 95 unit, 2 integration, 14 Chromium E2E, live DeepSeek batch and package passed |

## Phase 0 target

- Initialize the independent repository and pnpm toolchain.
- Establish strict TypeScript, ESLint, Vitest, Playwright and Vite build configuration.
- Produce a valid MV3 build with popup, options, onboarding, service worker and closed-Shadow-DOM content entry.
- Record architecture, decisions, source provenance, threat model and workspace scope.

## Important decisions

- All project mutations are confined to this independent repository root.
- The nested repository avoids mixing FloatRead commits with unrelated parent-workspace material.
- The local API credential stays under ignored `.secrets/`; it is not read before the real-provider checkpoint.
- V1 followed the specification at `0.1.0`; the owner-authorized page-translation redesign advances the release to `0.2.0`.
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
- Release/store screenshots have not been fabricated; the real-build capture checklist remains open.
- The human regression checklist is prepared but is not falsely marked executed.
- Only DeepSeek has a real API smoke record; other Provider adapters remain protocol-tested without live credentials.

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
- Secret source: ignored `.secrets/FloatRead-APIKEY.txt`, injected into a temporary environment variable without echo.
- Initial connection: HTTP success but `INVALID_RESPONSE` because DeepSeek V4 Thinking consumed the eight-token output limit before final content.
- Fix: the DeepSeek adapter explicitly sends `thinking: { type: "disabled" }`; request-format tests passed.
- Retest: connection, ordinary generation, streaming and cancellation all passed. No credential or output body was recorded.

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

## Phase 5 result

Implemented:

- Versioned runtime skin definitions and CSS design tokens for Native, Lens, Glass Orb, Pixel Bot, Ink and Terminal.
- Five visual states (`idle`, `ready`, `thinking`, `success`, `error`) with code-free built-in motion presets and reduced-motion override.
- Live settings preview, state preview, size/opacity/panel-width controls, no-reload activation and focused default restoration.
- Strict `.floatread-skin` import/export using JSON plus PNG/WebP only; exported packages contain no credentials or cache data.
- Central-directory preflight for entry count, traversal, duplicate names, encryption, ZIP64, compressed/uncompressed sizes and abnormal compression ratios.
- Strict schema validation for color/range/string/path/unknown fields, file-signature and browser decode validation, image dimensions and understandable errors.
- Separate metadata and IndexedDB binary-asset storage, 25 MB community capacity, replacement, deletion and idle-state fallback.
- Community assets cross the Content boundary only as validated image data; no code, HTML, SVG, CSS, font or remote URL can enter the skin runtime.
- Skin authoring and package-security documentation in `docs/SKINS.md`.

Verification before the phase commit:

| Command                 | Actual result                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm lint`             | Passed with zero warnings                                                                             |
| `pnpm typecheck`        | Passed                                                                                                |
| `pnpm test`             | Passed: 15 files, 79 tests                                                                            |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                                                              |
| `pnpm build`            | Passed; 14 production files emitted                                                                   |
| `pnpm verify:dist`      | Passed; dynamic execution, remote script and production Mock checks passed                            |
| `pnpm test:e2e`         | Passed: 7 real Chromium extension tests, including live apply plus a real export/import package cycle |

Controlled failures and fixes:

- The first package-security run exposed eager IndexedDB initialization in a non-browser import, a typed-array test fixture mismatch and a V0 field that survived strict migration. Storage now opens lazily, the fixture passes a stable ArrayBuffer, and migration removes the obsolete field.
- The first production verification found `new Function` inside JSZip's bundled `setImmediate` fallback. JSZip was removed entirely and replaced by the synchronous, preflight-bounded `fflate` codec; the security rule was kept unchanged and the production scan now passes.
- The first browser import-cycle test passed Playwright's extensionless temporary download path to the file input. The test now supplies the real exported bytes with the user-visible `.floatread-skin` filename, matching an actual import.

Knowledge After at Phase 5: no prior knowledge card was adopted. New project-local evidence retained: security scanning must inspect bundled transitive code, not only authored source; archive safety needs metadata preflight before decompression and decoded-image validation after decompression.

## Phase 6 result

Implemented:

- Full toolbar Popup with global enable/pause, current-site pause, current-page show/hide, Provider/model status, active skin, settings and GitHub entry.
- Immediate all-tab removal on global pause, origin-only site pause storage and an effective bootstrap that refuses to mount while paused.
- First-install three-step onboarding with privacy boundaries, complete Provider profile fields and secret modes, exact-origin authorization/test, six-skin selection and a zero-network local demo.
- Parent selection context menu with three localized mode children and direct selected-text execution through Background.
- All three manifest commands: default-mode execution, companion toggle and optional last-result copy; last results remain Content-memory-only and clear on pause/hide.
- Unified typed Chinese/English message catalog for Companion, result panel, Popup, onboarding and Options; localized manifest, command and context-menu strings.
- Reading behavior settings for default mode, direct-run versus action-menu behavior, and browser/Chinese/English UI locale.
- Keyboard activation that moves focus into the mode menu, localized result controls, exact X/Twitter host permissions and `activeTab`-only temporary use elsewhere.
- Dark-environment and reduced-motion styles across the page-owned UI; Popup and Options receive active-skin accents.

Verification before the phase commit:

| Command                 | Actual result                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm lint`             | Passed with zero warnings                                                                                  |
| `pnpm typecheck`        | Passed                                                                                                     |
| `pnpm test`             | Passed: 18 files, 90 tests                                                                                 |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                                                                   |
| `pnpm build`            | Passed; 18 production files emitted                                                                        |
| `pnpm verify:dist`      | Passed; closed Shadow DOM, no dynamic execution/remote script, no production Mock                          |
| `pnpm test:e2e`         | Passed: 13 real Chromium extension tests including Popup pause/show, onboarding, bilingual UI and keyboard |

Controlled failures and fixes:

- English browser locale initially broke Chinese-only E2E locators. Tests now assert localized accessible names, and a dedicated E2E switches the full settings shell between English and Chinese.
- A normal extension tab cannot reproduce a toolbar Popup's retained active-tab grant in headless Chromium. Trusted Popup messages now accept an optional, runtime-validated target tab ID; production Popup use still defaults to Chrome's active tab, while E2E can lock the fixture tab explicitly.
- Popup resume initially reported a stale hidden state because Content mounting was asynchronous. `SHOW_COMPANION`, refresh and direct-run messages now acknowledge only after the host mount promise completes.
- The custom switch initially hid its checkbox behind the visual track. The real checkbox now covers the track transparently, preserving keyboard focus and reliable pointer activation.

Knowledge After at Phase 6: no prior knowledge card was adopted. New project-local evidence retained: extension popup E2E must model the active-tab relationship explicitly, and command acknowledgement must wait for asynchronous Content mounting before Background reports visible state.

## Phase 7 result

Implemented:

- Complete English/Chinese READMEs, privacy notice, security policy, contribution guide, code of conduct, changelog and release notes.
- Provider setup, permission rationale, i18n, architecture, threat model and secure skin-authoring documentation.
- A 58-item human regression checklist that remains visibly unchecked until a human performs it.
- Read-only GitHub Actions CI with frozen dependencies, Chromium installation, full quality gate and release package verification.
- Secret scanner covering Git-tracked text, production output and unpacked release ZIP while intentionally excluding ignored `.secrets`.
- Release verifier proving ZIP and `dist` entry lists/bytes match, rejecting forbidden entries, verifying version consistency, and emitting SHA-256 plus file inventory.
- Production-load smoke that starts real Chromium with `dist`, waits for the MV3 Service Worker and renders Options, Popup and Onboarding.
- Reproducible `pnpm package` flow that rebuilds, verifies, scans, packages and re-verifies the published bytes.

Final automated verification before the phase commit:

| Command                  | Actual result                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `pnpm audit`             | Passed; no known vulnerabilities                                                           |
| `pnpm lint`              | Passed with zero warnings                                                                  |
| `pnpm typecheck`         | Passed                                                                                     |
| `pnpm test`              | Passed: 18 files, 90 tests                                                                 |
| `pnpm test:integration`  | Passed: 2 files, 2 tests                                                                   |
| `pnpm test:e2e`          | Passed: 13 real Chromium extension tests                                                   |
| `pnpm package`           | Passed: build, dist check, two secret scans, ZIP check and production Chrome load          |
| `pnpm test:release-load` | Passed: production MV3 worker plus Options, Popup and Onboarding rendered in real Chromium |
| `pnpm format:check`      | Passed before the final metadata update                                                    |

Release evidence:

- ZIP: `release/FloatRead-v0.1.0.zip`
- ZIP size: 268,464 bytes
- SHA-256: `7da4b46299585504118ad04351e556ebe40cc6de3ca10aed93a050a927a2409b`
- Inventory: `release/FloatRead-v0.1.0-files.txt`
- Digest file: `release/FloatRead-v0.1.0.sha256`
- Secret scan: passed across 178 tracked/build/archive text files after staging the smoke evidence

Controlled release-tool failures and fixes:

- Strict TypeScript rejected unchecked ZIP entry access; the verifier now requires every entry explicitly before use.
- The first scanner run treated clearly invalid unit-test values such as `sk-example-not-real` as credentials. It now exempts only values containing explicit `example`/`not-real` markers while retaining real-key patterns.
- One scanner regex initially lacked the global flag required by `matchAll`; the expression was corrected and the full scan passed.
- Two identical-content ZIP runs initially differed because archive entry timestamps used the current time. Packaging now fixes metadata time; two consecutive packages produced the same SHA-256.

Knowledge After at Phase 7: no prior knowledge card was adopted. New project-local evidence retained: release verification must compare archive bytes to the already-verified production tree, and secret scanning should enumerate tracked source rather than walking ignored credential directories.

## Authorized DeepSeek smoke result

The user confirmed `deepseek-v4-flash` on 2026-07-21. With the default `https://api.deepseek.com` Base URL, the final minimal live checks produced:

| Check               | Actual result                                                 |
| ------------------- | ------------------------------------------------------------- |
| Connection          | Passed in 976 ms; text received                               |
| Ordinary generation | Passed in 651 ms; 24 characters; 317 input / 12 output tokens |
| Streaming           | Passed in 772 ms; stream completed with 24 characters         |
| Cancellation        | Passed in 104 ms with `ABORTED`                               |

The first pre-fix connection returned `INVALID_RESPONSE` in 808 ms and did not proceed to other requests. Full details and credential-handling evidence are in `docs/REAL_API_SMOKE.md`. No other Provider used a real credential.

## V2 page-translation redesign

Owner acceptance on 2026-07-21 replaced the selection-only primary flow. The new object boundary is recorded in `docs/V2_PRODUCT_BOUNDARY.md`; BYOK, Background-only networking, credential isolation, no backend and no telemetry remain unchanged.

Implemented:

- No-selection companion click and Popup controls start user-authorized per-origin page translation.
- Visible/near-visible semantic text scanner with `content` versus `ui` classification; no private X `data-testid` dependency.
- Bounded batches (12 segments / 6,000 characters), strict JSON response parsing and exact ID-set validation.
- Background-only Provider request, exact host permission and persistent 2,000-record hashed translation memory.
- Restricted MutationObserver plus scroll/resize progression while active; no infinite timeline preloading.
- Stop/Resume/Clear state machine with generation IDs that discard every late result after cancellation.
- Precision-reading cancellation reducer now ignores buffered delta/done events after `CANCEL`.
- Companion size range expanded to 32–120px; result panel setting expanded to 760px and direct two-dimensional resize.
- Popup live progress and current-origin translation preference.

Verification at this checkpoint:

| Command                           | Actual result                                                           |
| --------------------------------- | ----------------------------------------------------------------------- |
| `pnpm typecheck`                  | Passed                                                                  |
| `pnpm lint`                       | Passed with zero warnings                                               |
| `pnpm test`                       | Passed: 19 files, 95 tests                                              |
| `pnpm test:integration`           | Passed: 2 files, 2 tests                                                |
| `pnpm exec playwright test`       | Passed: 14 real Chromium extension tests                                |
| `pnpm build` + `pnpm verify:dist` | Passed: 18 production files; production Mock removed                    |
| `pnpm smoke:deepseek-page`        | Passed: strict two-segment JSON batch in 1,144 ms; no body/key recorded |
| `pnpm audit`                      | Passed; no known vulnerabilities                                        |
| `pnpm format:check`               | Passed                                                                  |
| `pnpm package`                    | Passed: verified production ZIP and real-Chromium load                  |

V2 release evidence:

- ZIP: `release/FloatRead-v0.2.0.zip`
- ZIP size: 274,619 bytes
- SHA-256: `0e10539dfbc5e62d71aa17032716a56e5cb032d94f29492e2b477c280f61df98`
- Inventory: `release/FloatRead-v0.2.0-files.txt`
- Digest file: `release/FloatRead-v0.2.0.sha256`
- Two consecutive packaging runs produced the same SHA-256.

Controlled failures:

- The first page-scanner unit test exposed an empty JSDOM opacity string being coerced to zero; visibility now excludes opacity only when the computed value is explicitly present and zero.
- Two old E2E assertions encoded the superseded product boundary (no-selection click should show a selection hint; first keyboard item should be Natural Chinese). They were updated to assert the new page-translation primary path and still verify keyboard access to precision modes.

Project-loop conclusion for this round: the acceptance gap was product-level, not a selection-parser defect. Automated V2 delivery is complete; the remaining external acceptance gap is a human run on live X. Preserve the cancellation generation guard, bounded visible-page batches, Background-only credential boundary and exact-origin permissions in future iterations.

Knowledge After for V2: the earlier query had `no_relevant_hit`, so no external knowledge candidate was adopted or rated. Project-local evidence retained: asynchronous cancellation needs both transport abort and generation-ID result rejection; direct text-node translation must discard detached-node records; and changing a product boundary requires replacing obsolete acceptance assertions instead of treating them as regressions. No external knowledge asset was created because these findings are currently specific to FloatRead's implementation and tests.
