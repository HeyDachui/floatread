# FloatRead development progress

This file is the auditable project status source. A phase is only marked complete after its stated checks have actually run and its commit exists.

## Current status

- Current phase: 0.5.0 pet-system expansion — automated release candidate complete; owner visual acceptance pending
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
| V2.1  | Complete | `44d6861`                                  | 96 unit, 2 integration, 14 Chromium E2E and DeepSeek JSON smoke passed          |
| V2.2  | Complete | `85763347a7dece3ae68c54b9aac0eb5387cd1842` | 99 unit, 2 integration, 14 Chromium E2E and package passed                      |
| V2.3  | Complete | `83de8991bd8d34b71a6a6205cd79776634dfabee` | 99 unit, 2 integration, 15 Chromium E2E and safety package passed               |

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

## Version 0.5.0 pet-system expansion — 2026-07-23

Goal: keep the owner-accepted `stable-v0.4.1` source and ZIP unchanged while expanding the 0.5.0 candidate from one visually repetitive built-in pet into a reusable multi-pet, multi-state system.

Delivered:

- Three built-in original pets: Mochi, Maple red panda and Piko penguin.
- Five independent authored WebP state frames for Maple and Piko: idle, content found, translating, complete and error.
- Shared click, drag-walk, direction turn, low-frequency idle and rapid-scroll catch-up reactions; Mochi retains its layered blink, paw and tail behavior.
- Human-readable bilingual state labels and a visual Settings library grouped into Pet companions and Other appearances.
- Existing local PNG/JPG pet creation remains code-free and local; it deliberately uses single-image motion rather than claiming to generate new illustrated frames.
- All new animations obey the user toggle and `prefers-reduced-motion`.
- Ten 512 × 512 assets were compressed from about 1.3 MB lossless to 246,750 bytes total at reviewed browser-display quality.

Controlled failure and correction:

- The first Piko image-generation request failed from a network error and produced no adopted output. A single retry succeeded and only the reviewed second result entered the repository.
- The first full E2E run found the Settings preview-state buttons visible but not clickable because the preview layer suppressed pointer events. The tabs now explicitly accept pointer events; the targeted rerun and complete CI suite passed.

Actual verification:

| Command                 | Actual result                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm lint`             | Passed with zero warnings                                                                       |
| `pnpm typecheck`        | Passed                                                                                          |
| `pnpm test`             | Passed: 27 files, 140 tests                                                                     |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                                                        |
| `pnpm test:e2e`         | Passed: 20 Chromium MV3 tests, including both new pet state sets and live no-reload application |
| `pnpm run ci`           | Passed end-to-end                                                                               |
| `pnpm format:check`     | Passed                                                                                          |
| `pnpm package`          | Passed: 30-file dist/ZIP verification, MV3 load and two secret scans                            |

Implementation commit: `af8501a39b8ae3c0478514f4563047ce33f5bfcb` (`feat: expand the built-in pet system`).

Acceptance state: formal existence, runtime operation and automated quality passed. Visual quality was inspected from the actual Settings screenshot and final transparent assets. Natural feel on the owner's real X/TED/Reddit pages remains the owner acceptance item, so this stays a 0.5.0 release candidate and does not replace `stable-v0.4.1`.

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

## V2.1 missed-body reliability round

Owner acceptance found that some post bodies remained untranslated. The controlled variable for this round was scanner/write-back reliability; per-origin authorization, viewport-bounded scanning, Background-only networking, exact translation memory and the stop/resume/clear contract remained unchanged.

Root causes and changes:

- The scanner normalized internal whitespace before sending a segment, but write-back compared the normalized text with the unnormalized live node. Multiline or repeated-space posts therefore received a valid result that was silently discarded. Each segment now retains the exact original string for equality checking and restoration.
- The English heuristic rejected a whole node if it contained any Han character. It now accepts English-dominant mixed-language text while leaving Chinese-dominant nodes unchanged.
- The silent per-node limit increased from 1,500 to 6,000 characters, the response/output bounds increased accordingly, and compatible page batches request JSON-object mode.

Actual verification:

| Command                        | Result                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` / `pnpm lint` | Passed                                                                                                |
| `pnpm test`                    | Passed: 19 files, 96 tests                                                                            |
| `pnpm test:integration`        | Passed: 2 files, 2 tests                                                                              |
| `pnpm test:e2e`                | Passed: 14 Chromium extension tests, including multiline/mixed-body translation and exact restoration |
| `pnpm smoke:deepseek-page`     | Passed in 1,481 ms: JSON mode, 2 segments, 216 input / 38 output tokens; no body/key recorded         |
| `pnpm package`                 | Passed: 18-entry production ZIP and production Chromium load                                          |

Release evidence:

- ZIP: `release/FloatRead-v0.2.1.zip`
- Size: 274,666 bytes
- SHA-256: `10a7bcd2dcbd94e063bc895d5fd4acd5304c0b50aff0b2db34359e4b2765fc16`

Project-loop conclusion: the reported gap was reproduced by a deterministic multiline-text case and the changed test now passes. Live X remains the external acceptance condition; if a specific body still fails, its structural pattern (longer than 6,000 characters, cross-node styling, hidden/collapsed content, or React replacement) should determine the next controlled change.

Knowledge After for V2.1: the project knowledge query again returned `no_relevant_hit`, so nothing external was adopted. Project-local evidence retained: normalize text for Provider/cache semantics, but retain and compare the exact source string for safe asynchronous DOM write-back. This is not promoted outside the project until another DOM-localization consumer confirms the same failure mode.

## V2.2 dynamic-page reliability round

The owner reported remaining problems after 0.2.1. A live-X automated inspection was attempted in the configured Chrome environment, but `https://x.com/home` returned Cloudflare's security-verification page; it was not bypassed. Chrome's internal extensions page could not be programmatically claimed, so the owner's actually loaded extension version could not be independently read. The repository investigation therefore targeted remaining deterministic dynamic-page failure paths.

Implemented and verified:

- A translated text node reset by the host to its exact original is immediately changed back to the known local translation; no Background/API round trip is needed.
- Page completion now retries malformed JSON or another retryable Provider failure once and only once. Non-retryable credential/configuration errors stop after one call.
- Short English fragments inside semantic `lang` containers are eligible, and dialog/listbox/option/tooltip/footer UI roles are classified.
- The bounded page protocol and long-form scanner now support 12 segments / 12,000 total characters, with matching 16,000-character result/storage limits.

Verification:

| Command                        | Actual result                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` / `pnpm lint` | Passed                                                                                                            |
| `pnpm test`                    | Passed: 19 files, 99 tests                                                                                        |
| `pnpm test:integration`        | Passed: 2 files, 2 tests                                                                                          |
| `pnpm test:e2e`                | Passed: 14 real Chromium extension tests; React-style source reset was restored within the 20 ms assertion window |
| `pnpm package`                 | Passed: 18-entry production ZIP, release match, secret scans and production Chromium load                         |

Release evidence:

- ZIP: `release/FloatRead-v0.2.2.zip`
- Size: 274,833 bytes
- SHA-256: `0b6931bd0bfc221bd948f22feeb6350dafbebad6bac8a2bc5686a4f88a431b97`

Controlled test correction: the first post-change unit run retained the old oversized-batch fixture (7,200 characters). That value is valid under the new 12,000-character limit, so the assertion failed as expected. The fixture was changed to 13,200 characters; the complete 99-test run then passed.

Project-loop conclusion: all remaining failure modes that can be deterministically reproduced without the owner's authenticated X page now have executable regression coverage. The next useful input is a concrete still-English example after confirming Chrome displays version 0.2.2; its length, DOM fragmentation and whether it is collapsed/hidden will decide the next change. Repeating generic scanner changes without that evidence would reduce attribution and may increase cost.

## V2.3 crash and unstoppable-loop safety round

The owner reported that 0.2.2 stayed in the translating state, Stop had no effect and the page crashed. This real acceptance result invalidates 0.2.2's production-readiness claim; 0.2.2 is rejected and superseded by 0.2.3.

Root cause and safety changes:

- Immediate character-data reapplication could contend with React in a write/reset loop. It was removed; dynamic observation now watches child-list changes only.
- Mutation scans now coalesce behind the first scheduled timer instead of continually clearing and rescheduling it.
- Normal batches are reduced to 6 segments / 6,000 characters; one long eligible node may still use the 12,000-character protocol ceiling.
- Stop disables the origin preference, Background aborts its active job independently, and Content cancels its local generation. Reload never auto-starts translation.

Verification:

| Command                        | Actual result                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` / `pnpm lint` | Passed                                                                                              |
| `pnpm test`                    | Passed: 19 files, 99 tests                                                                          |
| `pnpm test:integration`        | Passed: 2 files, 2 tests                                                                            |
| `pnpm test:e2e`                | Passed: 15 real Chromium extension tests, including a 5 ms mutation storm and two reload assertions |
| `pnpm format:check`            | Passed                                                                                              |
| `pnpm package`                 | Passed: 18-entry production ZIP, release match, secret scans and production Chromium load           |

Release evidence:

- ZIP: `release/FloatRead-v0.2.3.zip`
- Size: 274,999 bytes
- SHA-256: `f665f1de544b44ae9749d615acbf50871c75282099ff7dc17af2734f8160d087`

Controlled test correction: the first safety E2E run timed out waiting for the former **Resume** label after Stop. Stop itself had succeeded and later text stayed English. Version 0.2.3 deliberately disables the origin preference, so the correct next action is **Translate this page**. The assertion was corrected and the complete 15-test suite passed.

Project-loop conclusion: 0.2.2 is rejected. Version 0.2.3 has formal artifacts, controlled functional operation and automated quality evidence. Real production readiness on authenticated X remains unknown until the owner completes the live-site check. Synchronous character-data contention must not be reintroduced.

### Preliminary live-X owner feedback — 2026-07-21

The owner used 0.2.3 for a short period and reported that it was substantially smoother than the previous version. This is positive real-environment evidence for the reduced mutation and batch pressure. It is recorded as preliminary feedback, not a complete manual pass: the owner has not yet explicitly confirmed the Stop-under-load, reload-stays-stopped, long-scroll coverage or no-crash checklist items. No code variable is changed on this evidence alone; the next useful acceptance evidence is those four targeted checks.

## Version 0.3 product simplification and pet round — 2026-07-22

Owner-confirmed scope: retain full-page translation but simplify the consumer surface; keep the software UI to Simplified Chinese/English; let users choose additional page-translation languages; record each explicit Start-to-Stop usage session; and make a pet-based companion plus one-image local pet creation the visual priority.

Implemented:

- Settings schema V2 with 1–5 unique source languages and one different target language; local detection covers Simplified/Traditional Chinese, English, Japanese, Korean, French, German, Spanish, Portuguese, Italian, Russian and Arabic.
- Serialized local usage ledger with Provider/model, source/target languages, requests, cache hits, translated segments, Provider-reported input/output tokens and end reason. Session startup is awaited before the first batch.
- Simplified Popup and AI settings, DeepSeek-first setup, 30-second default timeout and advanced-only service address/timeout.
- Original Mochi default pet asset plus state motion/press feedback and reduced-motion compliance.
- Local PNG/JPG pet preparation with size/type/dimension limits, connected-light-background removal, crop, WebP conversion, preview and safe skin storage.
- Product, source/provenance, privacy, architecture, Provider, i18n, skin and manual-testing documentation updates.

Controlled failures corrected during verification:

- The reduced-motion E2E initially looked only for the old orb artwork and then proved the pet still bounced. CSS and the assertion were corrected so image pets also have no animation.
- The old Popup E2E expected removed Start/Stop/Hide controls. It was replaced with the owner-approved simplified Popup contract; page translation is exercised through the pet.
- Adding the PNG input made a generic file-input locator ambiguous. The skin-package and pet-image inputs now have separate browser assertions.
- A full-sequence run found that `Date.toLocaleString("zh_CN")` crashed the settings page only after usage data existed. The date locale is now converted to standard `zh-CN`; the complete sequence passes.

Actual verification:

| Command                    | Actual result                                                                 |
| -------------------------- | ----------------------------------------------------------------------------- |
| `pnpm typecheck`           | Passed                                                                        |
| `pnpm lint`                | Passed, zero warnings                                                         |
| `pnpm test`                | Passed: 20 files, 105 tests                                                   |
| `pnpm test:integration`    | Passed: 2 files, 2 tests                                                      |
| `pnpm test:e2e`            | Passed: 16 real Chromium extension tests                                      |
| `pnpm package`             | Passed: 20 dist/ZIP entries, secret scans and production MV3 page/worker load |
| `pnpm smoke:deepseek-page` | Passed in 919 ms: 2 strict-JSON segments, 229 input / 39 output tokens        |

Release evidence:

- Implementation commit: `0ae860d6a21e352bceae38b9b16fdb9e796ea4a4`
- ZIP: `release/FloatRead-v0.3.0.zip`
- ZIP size: 435,000 bytes
- SHA-256: `631387595d36d412819acad51f86f8fff40933044d3d3e87d374a55ba08dd08c`
- Temporary test Key file deleted after the single final DeepSeek request; no credential was printed or retained.

Acceptance status: formal repository/artifact completeness passed; controlled functional and automated quality gates passed; real DeepSeek page-prompt readiness passed. Authenticated-X production quality for 0.3.0 remains an owner manual check, not an automated claim. Single-image custom pets have built-in motion presets rather than newly illustrated multi-frame animation.

## Version 0.3.1 open-tab recovery round — 2026-07-22

Owner acceptance report: after installing/testing the new build, clicking the companion did not start translation. Chrome configuration inspection confirmed that the unpacked extension path was the current workspace production directory (`E:\AI-900\FloatRead\dist`), so the investigation did not treat this as a wrong-package report.

Controlled diagnosis and changes:

- Extension reloads can invalidate an existing Content Script while leaving its closed-Shadow-DOM host visible. The old pet can therefore look installed but no longer communicate with Background.
- Background now probes already-open declared X/Twitter tabs on install/update. Healthy tabs are left alone; tabs without a live receiver receive one serialized Content Script injection.
- A newly injected Content Script removes the inert host left by the previous isolated world and mounts a fresh host. Mount also rechecks uniqueness after asynchronous bootstrap.
- `injectAndSend` now tries a live receiver first, avoiding the former unconditional reinjection on every trusted action.
- Normal pet click and Enter/Space now always start or stop full-page translation, even with a retained selection. Precision reading remains in the pet right-click menu and opens by Arrow Down for keyboard users; browser selection actions remain unchanged.

Project-loop evidence:

- Changed variables: extension-reload recovery and the pet's primary click contract.
- Held constant: Provider routing, scanner limits, mutation strategy, stop/abort behavior, language settings, prompts and credentials.
- New regression evidence covers stale-host replacement, live receiver reuse, stale receiver reinjection, selected-text page startup and keyboard precision access.
- The first full E2E run had 16/17 passes because the old keyboard assertion still expected the selection menu from Enter. The product contract and test were aligned to Enter = full page, Arrow Down = precision menu; the targeted retry and final full suite passed.

Actual verification:

| Command                 | Actual result                                                  |
| ----------------------- | -------------------------------------------------------------- |
| `pnpm lint`             | Passed, zero warnings                                          |
| `pnpm typecheck`        | Passed                                                         |
| `pnpm test`             | Passed: 22 files, 109 tests                                    |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                       |
| `pnpm test:e2e`         | Passed: 17 real Chromium extension tests                       |
| `pnpm format:check`     | Passed                                                         |
| `pnpm package`          | Passed: build, two secret scans, ZIP verification and MV3 load |

Release evidence:

- ZIP: `release/FloatRead-v0.3.1.zip`
- ZIP size: 435,305 bytes
- SHA-256: `a480d7402136fed0f95329d9f4310ebcdb65fb6c1d125cd35acb0a578123d90c`
- Real Provider calls this round: none. Provider code was unchanged; the 0.3.0 DeepSeek smoke is historical evidence only.

Acceptance conclusion: formal existence, controlled functional operation and automated release quality passed. The actual Chrome profile points to the workspace `dist`, and the newly built package is installable. Authenticated-X observation of the repaired 0.3.1 click path remains the owner's final real-use check after pressing Reload in `chrome://extensions`; it is not claimed as already observed.

## Version 0.3.2 visible failure-state round — 2026-07-22

Owner acceptance report: after the 0.3.1 update, the visible-page translation state still appeared to fail. Live Chrome inspection showed the authenticated X page remained in English and the FloatRead settings page was open. Chrome security policy prevented inspection of the extension page itself, so the exact Provider/credential value was not inferred or read from browser storage.

Controlled diagnosis and changes:

- Content already received structured page-batch errors, but `FloatingCompanion` rendered only the initial 2.5-second Start toast. Error states and their recovery path were invisible.
- Page translation now shows a persistent status beside the pet while scanning, translating or watching. The text includes the completed segment count.
- A zero-result watch state explicitly says that no visible text matches the configured source languages.
- Provider/permission/credential/network/model/response failures now remain visible, put the pet in its error state and expose a Settings button.
- Missing-credential wording explains that session-only and enter-each-time modes require re-entry after their extension session ends. The Key itself is never sent to Content or rendered.
- Mock-only error injection adds deterministic browser coverage without a real Provider call.

Project-loop evidence:

- Changed variable: page-translation state visibility and recovery guidance.
- Held constant: scanner limits, mutation observation, Provider routing, prompts, caching, stop/abort behavior, permissions and credential storage modes.
- The new browser case proves the error remains visible beyond the former 2.5-second timeout and offers recovery. The final full suite passed.
- Exact live-X external cause remains intentionally unknown until the owner reloads 0.3.2 and reads the now-visible status; this release removes the diagnostic blind spot rather than inventing a Provider result.

Actual verification:

| Command                 | Actual result                                                  |
| ----------------------- | -------------------------------------------------------------- |
| `pnpm lint`             | Passed, zero warnings                                          |
| `pnpm typecheck`        | Passed                                                         |
| `pnpm test`             | Passed: 22 files, 109 tests                                    |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                       |
| `pnpm test:e2e`         | Passed: 18 real Chromium extension tests                       |
| `pnpm format:check`     | Passed                                                         |
| `pnpm package`          | Passed: build, two secret scans, ZIP verification and MV3 load |

Release evidence:

- ZIP: `release/FloatRead-v0.3.2.zip`
- ZIP size: 435,817 bytes
- SHA-256: `a91e41965cfbcdc9b4b1d721f8df0d1378e5a49340ab6ac41e016cd0a3625b45`
- Real Provider calls this round: none; no new Token usage.

Acceptance conclusion: formal existence, controlled functional operation and automated release quality passed. The failure reason will now be observable at the real X entry. Authenticated-X recovery is pending one owner reload and click; it is not claimed as already passed.

## Version 0.3.3 Service Worker startup recovery round — 2026-07-22

Owner acceptance report: page translation still failed after 0.3.2. This time the authenticated X tab was inspected directly in the owner's Chrome profile. The FloatRead companion was present and displayed the persistent message `页面翻译连接已断开，请重试。` while the page remained untranslated. This is direct evidence that the failure occurred before credentials, Provider routing or text scanning.

Controlled diagnosis and changes:

- 0.3.1 recovery was attached only to `runtime.onInstalled`. Reloading the same unpacked version starts a fresh Manifest V3 Service Worker but does not reliably emit that event, leaving the old visible Content Script disconnected.
- Open declared-site tabs are now probed on every Service Worker lifetime, after storage initialization. Healthy receivers are left untouched; only missing/stale contexts use the existing serialized reinjection path.
- Recoverable match patterns are derived from the built manifest and filtered to HTTP(S), eliminating a duplicate hard-coded site list.
- Scanner limits, mutation behavior, Provider routing, prompt/cache versions, stop/abort behavior, credentials and permissions were held constant.

Regression design and project-loop evidence:

- A deterministic Service Worker startup test proves recovery is invoked without firing `runtime.onInstalled`.
- Existing injection tests still prove healthy-context reuse, stale-context reinjection and injection serialization.
- An attempted browser test using `chrome.runtime.reload()` was rejected because Chromium closes Playwright's extension browser context itself, so it cannot observe post-reload behavior in the same harness. This harness limitation was not reported as a product failure; the test was replaced by the deterministic startup regression.
- The isolated variable is the recovery trigger. The next real-use acceptance signal is whether the already-open authenticated X tab starts translating after one extension Reload without refreshing the page.

Knowledge-cycle closure:

- The project knowledge connector was queried before changing the repeated failure path, but FloatRead had no configured/relevant connected knowledge object (`no_relevant_hit`). No external recommendation was adopted.
- Current-project evidence was used instead: the live disconnected-status screenshot plus the 0.3.1/0.3.2 progress record. The prior rule to avoid character-data observer loops and keep bounded scanning unchanged was preserved.
- Result: project-local recovery evidence was added here; no new cross-project reusable knowledge object was created (`no_reusable_finding`).

Actual verification:

| Command                 | Actual result                                                  |
| ----------------------- | -------------------------------------------------------------- |
| `pnpm lint`             | Passed, zero warnings                                          |
| `pnpm typecheck`        | Passed                                                         |
| `pnpm test`             | Passed: 23 files, 110 tests                                    |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                       |
| `pnpm test:e2e`         | Passed: 18 real Chromium extension tests                       |
| `pnpm format:check`     | Passed                                                         |
| `pnpm package`          | Passed: build, two secret scans, ZIP verification and MV3 load |

Release evidence:

- ZIP: `release/FloatRead-v0.3.3.zip`
- ZIP size: 435,887 bytes
- SHA-256: `efa5fdf3ed2ee85f215c713ddd01f9f506425a09d34ab36e375532f3810208cb`
- Secret scan: passed across tracked source, build and archive text files; no credential was printed or retained.
- Real Provider calls this round: none; no new Token usage.

Acceptance conclusion: repository, automated function and package quality gates passed. The exact live failure is now covered by startup recovery, but authenticated-X recovery still requires one owner Reload and click; it is not claimed as already observed.

## Version 0.3.4 visible-first incremental translation round — 2026-07-22

Owner acceptance report: after loading 0.3.3, the authenticated X page connected and displayed `正在翻译可见页面，已完成 0 处…`, but no text changed for more than ten seconds. The owner asked whether FloatRead was translating beyond the visible page.

Live-X evidence and attribution:

- A viewport screenshot showed multiple fully visible English posts and a connected active companion, excluding the prior disconnected-context cause.
- A bounded read-only measurement of the real page found 72 text nodes intersecting the 1,920×855 viewport and 13 additional nodes inside the old 280-pixel below-viewport margin. Therefore 0.3.3 was not strictly viewport-only, although it was not scanning the entire timeline.
- DOM-order samples began with clipped keyboard-shortcut assistance and left navigation labels. Because the scanner stopped after six accepted nodes, the first batch could precede the post body the owner was reading.
- Production page batches used non-streaming completion and posted results only after validating the entire JSON object. A live request could therefore remain at zero until every item completed even when generation had begun.

Controlled changes:

- Text visibility now uses the text node's Range rectangle, rejects clipped/hidden/`aria-hidden` content and requires strict viewport intersection with no preloading margin.
- Candidate collection ranks visible article content before UI labels, then follows visual top position. Menus still translate after content and remain cacheable.
- Provider page output now streams. Only complete JSON item objects that pass the existing strict id/text schema are posted early; the full response is still validated before caching and batch completion.
- DeepSeek streaming requests ask for usage metadata so input/output Token records remain available when the Provider supplies them.
- The three changes are coupled to one user-visible latency path: scan less, select the currently read content first, and expose each safe result without waiting for unrelated batch items.

Project-loop boundaries:

- Changed variables: viewport boundary, first-batch priority and result-delivery timing.
- Held constant: six-segment/6,000-character limits, child-list-only mutation observation, explicit user activation, Provider/model/profile, prompt text and version, cache key, one-retry limit, timeout, immediate Stop/abort, credentials and permissions.
- Stopping condition for this loop is a real authenticated-X 0.3.4 run where the first visible post changes promptly, below-the-fold text waits for scrolling and a second click stops the active request.

Knowledge-cycle After:

- Before status: `no_relevant_hit`; the FloatRead project is not configured in the local knowledge connector, so no external/local candidate was adopted and no feedback query id exists.
- Reusable candidate from current evidence: on virtualized dynamic pages, parent-element geometry can misclassify clipped accessibility text as visible; text-node Range geometry plus strict viewport intersection is the safer boundary. When an AI returns structured batches, validating and emitting complete individual objects provides visible progress without rendering incomplete JSON.
- Evidence: the real-X 72/13 node measurement, DOM-order samples, new unit cases and Chromium below-viewport regression. This applies to client-side dynamic pages; it should be reconsidered for canvas content, cross-origin frames or layouts where Range rectangles are unavailable.
- Suggested reception: retain in this project record until a configured knowledge consumer exists; it was not promoted to a global rule or Skill.

Actual verification:

| Command                 | Actual result                                                  |
| ----------------------- | -------------------------------------------------------------- |
| `pnpm lint`             | Passed, zero warnings                                          |
| `pnpm typecheck`        | Passed                                                         |
| `pnpm test`             | Passed: 23 files, 113 tests                                    |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                       |
| `pnpm test:e2e`         | Passed: 18 real Chromium extension tests                       |
| `pnpm format:check`     | Passed                                                         |
| `pnpm package`          | Passed: build, two secret scans, ZIP verification and MV3 load |

Release evidence:

- ZIP: `release/FloatRead-v0.3.4.zip`
- ZIP size: 436,667 bytes
- SHA-256: `98cbbd5ca9059db0b33725ab6f5f3a6beae42019113303298288125825c984aa`
- Secret scan: passed across tracked source, build and archive text files; no credential was printed or retained.
- Real Provider calls this round: none; no new Token usage.

Acceptance conclusion: formal repository, controlled function, automated quality and installable-package checks passed. The owner's authenticated X path is not claimed as passed until 0.3.4 is reloaded and observed through the three stopping-condition checks above.

## Version 0.3.5 mixed-name and resilient-connection round — 2026-07-22

Owner acceptance report: 0.3.4 was substantially better, but a visible phrase such as `ChatGPT Work => ChatGPT HelpMeWithEverything?` remained untranslated and the page repeatedly reported a disconnected translation link.

Controlled diagnosis and changes:

- The page Prompt's former “preserve product/person/technical names” rule allowed the model to treat an entire mixed phrase as a proper name. V3 now preserves only genuine proper-noun portions and `@handles`, while explicitly requiring ordinary words, actions and descriptions in the same display text to be translated.
- `PAGE_TRANSLATION_PROMPT_VERSION` changed from V2 to V3, so cached results created under the over-broad preservation rule cannot mask the fix.
- Chrome's documented Manifest V3 lifecycle terminates a worker after roughly 30 seconds of inactivity; opening a long-lived Port alone no longer resets that timer, while sending a Port message does. Active Provider page jobs now send a text-free `PAGE_BATCH_PROGRESS` heartbeat every ten seconds and clear it as soon as the job ends.
- If a Port still disconnects, Content retains its session id and completed Text-node translations, clears only unfinished segments, reconnects up to three times and resubmits the currently visible unfinished text. A reconnect must remain stable for two seconds before its retry count is cleared, preventing rapid disconnect loops. User Stop cancels reconnect timers and remains authoritative.
- `startUsageSession` now reopens an existing matching UUID instead of replacing it, preserving accumulated requests, cache hits and Token totals across a transient Background restart.

Project-loop boundaries:

- Changed variables: mixed-name Prompt semantics/cache version and active-job connection resilience.
- Held constant: strict viewport boundary, content-first ordering, six-segment/6,000-character limit, Provider/model, one retry, timeout, pure-text rendering, permissions, credential isolation and user Stop behavior.
- Automated stopping evidence requires mixed-name prompt coverage, heartbeat protocol validation, Port reconnect with the same UUID, retained usage totals, full E2E and package gates. Real-use closure still requires the owner to observe 0.3.5 on authenticated X over a longer page session.

Knowledge-cycle After:

- Before status: `no_relevant_hit`; FloatRead remains unconfigured in the local connector, so no query id or external candidate was adopted from it.
- The official Chrome lifecycle evidence directly changed the implementation: a Port opening is insufficient, while messages sent through long-lived messaging reset service-worker activity. This supported a job-scoped heartbeat rather than an indefinite global keepalive.
- Reusable bounded judgment: long-running Manifest V3 work should keep itself alive only while an authorized job exists, persist resumable identity/counters outside global memory, and make Stop cancel both work and recovery. This does not apply to short one-shot events or justify keeping a worker alive permanently.
- Suggested reception: retain in this project record; no global Skill or rule was modified.

Actual verification:

| Command                 | Actual result                                                  |
| ----------------------- | -------------------------------------------------------------- |
| `pnpm lint`             | Passed, zero warnings                                          |
| `pnpm typecheck`        | Passed                                                         |
| `pnpm test`             | Passed: 24 files, 117 tests                                    |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                       |
| `pnpm test:e2e`         | Passed: 18 real Chromium extension tests                       |
| `pnpm format:check`     | Passed                                                         |
| `pnpm package`          | Passed: build, two secret scans, ZIP verification and MV3 load |

Real Provider checkpoint:

- Provider/model: DeepSeek / `deepseek-v4-flash`.
- Check: one V3 streamed two-segment page batch, including the owner's mixed-name example and the fixed harmless Codex sentence.
- Result: passed; first validated segment 1,111 ms, total 1,245 ms, two exact ids, mixed-name output changed while preserving `ChatGPT`.
- Usage: 310 input + 49 output = 359 total Token.
- No response body, Authorization header or credential was retained in logs or documentation.
- The owner explicitly requested retention of the low-limit test credential. It remains only at the Git-ignored `.secrets/FloatRead-APIKEY.txt`; it is absent from tracked files, `dist` and release ZIP.

Release evidence:

- ZIP: `release/FloatRead-v0.3.5.zip`
- ZIP size: 437,302 bytes
- SHA-256: `cb80b7c2d99ebb60e1824edac6d110b681542618535a2d2f6d2797e54dea6e8e`
- Secret scan: passed before packaging and again after the real smoke record; ignored owner-retained secret was not copied to any artifact.

Acceptance conclusion: formal, controlled functional, automated quality, real DeepSeek V3 Prompt/stream and installable-package evidence passed. Authenticated-X long-session continuity remains owner-observed acceptance, not an automated claim.

## Version 0.4.0 product expansion — started 2026-07-22

Current goal:

- Add fast, smart and precise page-translation levels while preserving AI translation quality.
- Add a lightweight detected-language decision without extra AI calls before consent.
- Stop new Provider batches while the page is hidden, allow at most one already-submitted batch to finish, and resume on return only when the user did not explicitly stop.
- Add enhanced page strategies for X, TED and Reddit while retaining the generic-page fallback.
- Keep direct replacement and Token-only usage reporting; do not add price estimates.
- Replace the built-in pet's superficial motion with natural blink, walk, turn and click feedback; keep user-uploaded single-image pets on the lighter local-processing path.

Independent pet-module handoff:

- Owner: current FloatRead primary task.
- Visible execution task: `019f8991-8299-7ac1-b1f1-11d54ecf3473` on host `local`.
- Scope: built-in pet animation module and dedicated tests only; no translation, Provider, permissions, version, release or credential changes.
- Primary trigger: owner pulls the completed task result, inspects the real files, runs repository-wide tests, requests targeted repair if needed, then integrates or rejects it.
- Current state: running; no completion claim has been accepted.

Knowledge-cycle Before:

- Query attempted through the configured local connection layer for MV3 translation modes, hidden-tab Token control, X/TED/Reddit adapters and pet animation.
- Result: FloatRead is not configured in the connector, so there was no relevant hit or query id. No external candidate was adopted; implementation proceeds from current repository evidence and platform documentation.

Stopping evidence for this round will include schema migration, strict message validation, timing instrumentation, hidden-tab tests, language-decision tests, platform-strategy tests, pet-module acceptance, full lint/type/unit/integration/E2E/package gates and a bounded real DeepSeek comparison. None of those are claimed complete at this starting checkpoint.

### Version 0.4.0 completion record — 2026-07-22

Implemented outcomes:

- Added Fast, Smart (recommended) and Precise page translation. Fresh installs use Smart; existing schema-v2 users migrate to Precise so an update does not silently lower their prior translation quality.
- Fast batches up to 12 segments/12,000 characters, Smart 8/8,000 and Precise 6/6,000. All three retain strict JSON ids, one retry at most, streaming, cancellation and direct text replacement.
- Reused the existing local scan to report newly detected languages. The user can translate once, remember the language for that origin or ignore it; the decision message contains only the language and choice, and no Provider call occurs before consent.
- Hidden pages stop scanning and submitting new batches. At most one already-submitted batch can finish. Returning resumes only if the user did not press Stop. A deterministic content-module test covers this isolated-world rule; Playwright's headless multi-page context did not expose a reliable real `document.hidden` transition to the extension isolated world, so an actual Chrome tab switch remains a manual observation instead of a claimed browser-E2E pass.
- Added semantic profiles for X, TED, Reddit and generic sites without private X selectors. TED live captions, timers, progress and log regions are excluded from translation.
- Preserved Token-only reporting: each Start-to-Stop session records request count, cache hits, input Token, output Token and total Token in Popup/settings; no fee estimate was added.
- Integrated the visible pet task's Mochi module after inspecting its source and actual screenshots. Mochi now has low-frequency blink, drag-walk, horizontal turn, press and request-state feedback, with reduced-motion support. User-uploaded images remain on the lighter local-processing path.

Independent pet-module handoff closure:

- Visible execution task: `019f8991-8299-7ac1-b1f1-11d54ecf3473` (`local`).
- Task result was not accepted from its completion message alone. The primary task reviewed `CompanionArtwork.tsx`, `pet-mochi.css`, `pet-motion.ts`, the dedicated unit tests and real screenshots, then ran repository-wide gates in the main workspace.
- Integration commit: `a32cf96 feat: animate the built-in Mochi companion`.
- Acceptance: formal existence passed; functional and automated quality evidence passed; natural motion on the owner's real pages remains an explicit manual observation. The visible task was archived after integration.

Actual verification:

| Command                    | Actual result                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm format`              | Passed                                                                                       |
| `pnpm lint`                | Passed, zero warnings                                                                        |
| `pnpm typecheck`           | Passed                                                                                       |
| `pnpm test`                | Passed: 26 files, 129 tests                                                                  |
| `pnpm test:integration`    | Passed: 2 files, 2 tests                                                                     |
| `pnpm test:e2e`            | Passed: 18 real Chromium extension tests                                                     |
| `pnpm format:check`        | Passed                                                                                       |
| `pnpm package`             | Passed: production build, dist/ZIP checks, two secret scans and Chrome MV3 release-load test |
| `pnpm smoke:deepseek-page` | Passed: one Fast and one Precise bounded streaming request; all six strict segments returned |

Real Provider evidence:

- Provider/model: DeepSeek / `deepseek-v4-flash`; Base URL `https://api.deepseek.com`.
- Fast: first validated item 1,398 ms, total 1,909 ms, 405 input + 110 output = 515 Token.
- Precise: first validated item 1,147 ms, total 1,683 ms, 406 input + 110 output = 516 Token.
- This small sample proves both production prompts and parsers work and Fast was below two seconds. It does not prove Fast is always quicker: Fast was 226 ms slower here because one request per mode is dominated by Provider/network variance. Its deterministic long-page benefit remains fewer batches, and same-page sustained comparison remains manual.
- No response body, Authorization header or credential was retained. Temporary environment variables were removed. The owner-retained low-limit key remains only in Git-ignored `.secrets/FloatRead-APIKEY.txt` and is absent from tracked source, `dist` and the ZIP.

Release evidence:

- ZIP: `release/FloatRead-v0.4.0.zip`
- ZIP size: 443,368 bytes
- ZIP entries: 20
- SHA-256: `585a909944c9568a633f56328220283dc6876b4ad5ca35c7baa4b91b3fcbea0f`
- Manifest V3 production load: passed with three extension pages.
- Secret scan: passed before and after archive generation across tracked/build/archive text files.

Knowledge-cycle After:

- Before result: FloatRead was not configured in the local connector, so no relevant hit or query id existed and no connected-knowledge recommendation was adopted.
- Bounded project finding: background-page control must live in the Content Script's isolated world. Headless Chromium opening another page does not reliably reproduce an actual extension-world visibility transition, and a main-world override does not cross the isolation boundary. The deterministic module path is therefore automated, while a real tab switch remains manual. This is a harness boundary, not evidence that hidden-tab behavior passed on a real site.
- Bounded project finding: platform profiles should avoid high-frequency live-media regions such as TED captions/timers to prevent churn and Token waste; this does not justify broad site-specific private selectors.
- No global Skill or external knowledge object was modified. These findings remain in the project record until a configured knowledge consumer exists.

Production-delivery acceptance:

- Formal existence: passed; source, tests, docs, `dist` and ZIP are present and version-aligned at 0.4.0.
- Functional operation: passed for controlled Chromium extension flows, real DeepSeek Fast/Precise batches and release loading.
- Required quality: automated gates and bounded visual inspection passed. Natural pet motion, live hidden-tab switching and authenticated X/TED/Reddit long-session behavior remain manual/unknown rather than falsely passed.
- Ready for owner testing: yes. Store/publication readiness remains blocked on canonical branding, approved screenshots and completion of the manual live-site checklist.

## Version 0.4.1 precision-reading source and Stop recovery — 2026-07-22

Owner evidence:

- A complete public `@ChatGPTapp writing feature` post was first page-translated, then Natural Chinese remained spinning and could not be stopped.
- The owner observed that precision reading appeared to follow the currently rendered page language rather than the real source language.

Controlled attribution and changes:

- The Natural Chinese Prompt already unconditionally requested Simplified Chinese and accepted no UI-locale parameter. The language coupling was therefore not in the Prompt.
- Page translation stores original and translated Text-node values, but selection capture read only `window.getSelection().toString()`. Once the page had been translated, precision reading sent the visible translation back as its source. Applied translations now retain their normalized source text, and the selected text is restored before Natural Chinese, Key Points or Explain Terms starts. The panel's “Original” view uses that same restored source.
- Precision generation used one long-lived Port without a disconnect transition. A lost Service Worker/Port could leave the reducer in requesting/streaming forever. The client now emits a retryable error for the active request on disconnect and creates a fresh Port on Retry.
- Sending Stop to an already dead Port could throw before the local reducer changed state. Precision Stop now swallows dead-Port errors after clearing its active id. Page-translation Stop captures the outgoing ids, clears local active/busy/pending state and publishes `paused` first, then only best-effort notifies a still-live Port.
- Held constant: Natural Chinese Prompt wording/version, Provider/model, credentials, page Prompt/cache, platform profiles, direct replacement, permissions and Token accounting.

Regression evidence:

- The exact reported tweet fragments are covered by a source-restoration unit test.
- Generation-client tests prove an active disconnect becomes a retryable error, Retry opens a second Port, and Stop never throws on a dead Port.
- Page-translator test proves dead-Port Stop immediately reaches `paused`.
- A real Chromium extension test performs: start page translation → select the visible Chinese replacement → run Natural Chinese → verify the output follows the original English and the Original panel displays English.

Actual verification:

| Command                       | Actual result                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `pnpm format`                 | Passed                                                                         |
| `pnpm lint`                   | Passed, zero warnings                                                          |
| `pnpm typecheck`              | Passed                                                                         |
| `pnpm test`                   | Passed: 27 files, 133 tests                                                    |
| `pnpm test:integration`       | Passed: 2 files, 2 tests                                                       |
| `pnpm test:e2e`               | Passed: 19 real Chromium extension tests                                       |
| `pnpm format:check`           | Passed                                                                         |
| `pnpm package`                | Passed: build, dist/ZIP verification, two secret scans and production MV3 load |
| `pnpm smoke:deepseek-natural` | Passed: one bounded Natural Chinese stream using the reported public tweet     |

Real Provider and release evidence:

- DeepSeek / `deepseek-v4-flash`: 1,288 ms, 109 output characters, 365 input + 52 output = 417 Token.
- Retained checks: Chinese present, `ChatGPTapp` preserved, targeted English sentences absent. The output body and credential were not logged or saved.
- ZIP: `release/FloatRead-v0.4.1.zip`; 443,831 bytes; 20 entries.
- SHA-256: `f46c9872ee611ba9142e90a4f1cb4732dcccd1f46cd5b25a26a75d62a664498d`.
- The owner-retained test key remains only in Git-ignored `.secrets/FloatRead-APIKEY.txt`, outside tracked source, `dist` and ZIP.

Project-loop conclusion:

- Object: precision reading invoked after direct page replacement, plus its Stop path.
- Actual change: downstream precision reading now consumes original-source identity, and disconnected requests leave the spinner deterministically.
- Stopping evidence: source-restoration unit proof, dead-Port unit proofs, full Chromium path, real Provider metadata and installable package all passed.
- Remaining owner observation: reload 0.4.1 on the authenticated X page and repeat the exact report. Natural wording remains a human quality judgment; automated metadata only proves language conversion and preservation constraints.

Knowledge-cycle After:

- Before result: FloatRead remains unconfigured in the local connector, so there was no relevant hit, query id or adopted external recommendation.
- Bounded reusable finding: when a client replaces rendered source text but offers downstream selection-based analysis, the selection path must preserve original-source identity instead of trusting rendered `Selection.toString()`. This applies to controlled DOM replacement systems; it does not authorize reading hidden or unselected source content.
- Bounded reusable finding: user cancellation should update local UI/state before best-effort transport notification, because a dead transport is exactly when cancellation must remain usable. This does not replace server-side abort when the transport is healthy.
- Evidence is the reported failure, source-map change, dead-Port tests and Chromium path. These findings remain project-local because no configured natural consumer exists.

Acceptance conclusion:

- Formal existence, controlled function, automated quality, real DeepSeek metadata and installable package passed.
- The owner can test 0.4.1 directly. Authenticated-X observation is still unknown and is not represented as passed.

### Owner live-site acceptance — 2026-07-22

- The owner installed/reloaded 0.4.1 and tested both authenticated X and TED through the requested checks.
- Owner result: no problem observed. This closes the reported translated-selection, Natural Chinese spinner/Stop, connection stability and page responsiveness loop for the tested X/TED paths.
- Acceptance scope is limited to the owner's tested X and TED sessions. Reddit remains untested by the owner and is not marked passed.
- Project-loop status: stop this repair loop because automated regressions, real Provider metadata, installable package and owner live-use observation now agree. Reopen only if a reproducible X/TED regression appears or Reddit reveals a distinct platform issue.

### External AI audit excerpt triage — 2026-07-22

- Source: owner-relayed excerpt from an external AI audit of the 0.4.1 source package; auditor identity/task id was not supplied. The omitted positive portion is not treated as inspectable evidence.
- Medium hidden-tab finding: accepted as an unresolved real-Chrome verification gap, not a confirmed defect. Immediate cancellation was not adopted because it conflicts with the approved one-in-flight-batch rule and cannot guarantee remote usage recovery after an abort.
- Low pet finding: accepted as subjective UX feedback; no security or code change.
- Low performance finding: accepted. Manual and release wording now measure Fast/Precise without promising Fast wins every individual call.
- Full decision record: `docs/AUDIT_RESPONSE_0.4.1.md`.
- Handoff closure for the supplied excerpt: triage complete; no code defect confirmed. Real Chrome background >45 seconds/worker inactivity remains the next manual release trigger.

## Version 0.5.0 automatic local memory — 2026-07-22

Object and stable boundary:

- Loop object: FloatRead translation reuse and the user-visible local-memory controls.
- Stable input: owner-accepted 0.4.1 on X and TED, including original-source precision reading, immediate Stop, visible-only scanning, Provider routing, Token ledger, permissions and companion behavior.
- Stable artifact: annotated Git tag `stable-v0.4.1` points to commit `fbd1487`; `release/FloatRead-v0.4.1.zip` remains unchanged with SHA-256 `f46c9872ee611ba9142e90a4f1cb4732dcccd1f46cd5b25a26a75d62a664498d`.
- Development isolation: all 0.5.0 work is on branch `feature/automatic-memory-v0.5.0`.

Changed variable and implementation:

- Replace the separate 2,000-record page memory and user-tuned reading cache behavior with one automatic 10 MB result-memory budget.
- Recent and long-term tiers each target 5 MB. The targets are soft: either tier may borrow unused space, and overflow first reclaims the borrowing tier.
- UI/functional text and source phrases up to 240 characters are eligible for promotion. They enter recent memory and become long-term after two cache hits (the third encounter). Long-term records can remain for one year; recent records expire after 30 days.
- Language pair, segment kind/reading mode, Provider origin, model and Prompt version remain part of the hash identity, so incompatible translation settings do not reuse an old result.
- Page-memory migration is lazy and requested-key-only. At most the current bounded page batch is written during one migration step; the remaining legacy records stay intact if the new write fails.
- Batch writes use one IndexedDB capacity pass rather than one full capacity scan per translated segment.
- Settings now expose automatic local storage, current-session storage or off, recent/long-term usage, reuse count, estimated saved Token and clear. TTL, entry-count and MB tuning are no longer user-facing.
- API keys, original source text and synchronized storage remain outside the result-memory database. Cache failure remains a silent miss and cannot block or retry a Provider request.

Evidence so far:

| Command                                  | Actual result                                                                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run ci` on untouched 0.4.1         | Lint, typecheck, 133 unit, 2 integration, build, dist verification and secret scan passed; 18 E2E tests passed and the final test's `afterAll` browser-close hook timed out |
| Single rerun of final 0.4.1 E2E          | Passed in 3.7 seconds; confirms the full-run failure was an intermittent test cleanup timeout, not a failed Stop assertion                                                  |
| `pnpm test` after core 0.5.0 change      | Passed: 27 files, 135 tests                                                                                                                                                 |
| `pnpm lint` after core 0.5.0 change      | Passed, zero warnings                                                                                                                                                       |
| `pnpm typecheck` after core 0.5.0 change | Passed                                                                                                                                                                      |

New regression coverage:

- Repeated eligible text remains recent after one reuse and is promoted after the second reuse.
- Reuse count and estimated saved Token are derived from local records.
- A tier may borrow unused capacity; when total capacity is exceeded, recent overflow is removed before protected long-term memory.
- Legacy page memory migrates only the requested key and retains unrequested legacy records.

Current status and stopping condition:

- Core production and unit-level controlled behavior is implemented.
- Remaining before completion: full integration/E2E rerun, production package/secret scan, installed settings-memory UI inspection, 0.5.0 commit and release hashes.
- Keep 0.4.1 stable unchanged. Stop and return to the stable artifact if 0.5.0 changes page translation, cancellation, API-key isolation or visible-page responsiveness.

### 0.5.0 automated release-candidate verification

- Implementation commit: `ec8175c` on `feature/automatic-memory-v0.5.0`.
- Final `pnpm run ci`: passed lint, strict typecheck, 27/136 unit tests, 2/2 integration tests, production build/dist/secret checks and 19/19 Chromium extension tests.
- Final `pnpm package`: passed production build, 20-file dist verification, secret scan, ZIP creation, 20-entry ZIP verification, production MV3 Service Worker/three-page load and second secret scan.
- Release candidate: `release/FloatRead-v0.5.0.zip`, 445,775 bytes, SHA-256 `521beb3e012b33b185b257bf97a1d61af1289646ec02eded8d9c71edd9332812`.
- Production Manifest is 0.5.0 with the unchanged permission set and no `unlimitedStorage` request.
- Production-delivery acceptance: formal existence, functional operation and automated quality passed. Real owner use on authenticated live sites remains unknown for 0.5.0, so it is ready for owner testing but is not promoted over `stable-v0.4.1` yet.

Project-loop conclusion:

- Actual change: repeated short/function translations now affect later runs through local promotion and measured reuse, while unique recent results remain bounded and disposable.
- Main eliminated risk: migration and page-batch writes are bounded; neither performs a full 2,000-record rewrite or one full capacity scan per segment.
- Kept invariant: cache failure is only a miss; it cannot block Stop, page translation, precision reading or Provider completion.
- Next deciding evidence: owner compares 0.5.0 with the accepted 0.4.1 path on live X/TED, repeats one menu phrase three times, checks the memory card and confirms page responsiveness. Promote only if those observations agree with automation.

## Version 0.5.0 rapid-scroll current-viewport priority — 2026-07-23

Controlled change:

- Stable `main` and tag `stable-v0.4.1` were not changed. Work continued only on `feature/automatic-memory-v0.5.0`.
- When page translation is busy and the page moves at least `max(480 px, 0.85 viewport)` within 600 ms, Content immediately invalidates the old job, clears only its unfinished node map and sends `PAGE_TRANSLATE_CANCEL` to Background.
- Scroll events replace one 220 ms settle timer. This prioritizes the final current viewport without creating a Provider request for every wheel event.
- Small/slow reading scrolls retain the old one-batch-at-a-time behavior.
- A catch-up notice is emitted at most once per 20 seconds. The companion shows “太快啦，我先跟上你现在看到的内容～” for two seconds and applies a 700 ms catch-up reaction; `prefers-reduced-motion` continues to suppress artwork animation.
- The notice uses local UI only and causes no AI request or Token use. Provider work completed before cancellation may still be billable; documentation does not promise otherwise.

Regression and production evidence:

| Command                 | Actual result                                                                   |
| ----------------------- | ------------------------------------------------------------------------------- |
| `pnpm lint`             | Passed, zero warnings                                                           |
| `pnpm typecheck`        | Passed                                                                          |
| `pnpm test`             | Passed: 27 files, 138 tests                                                     |
| `pnpm test:integration` | Passed: 2 files, 2 tests                                                        |
| `pnpm test:e2e`         | Passed: 20 Chromium MV3 tests                                                   |
| `pnpm run ci`           | Passed end to end                                                               |
| `pnpm package`          | Passed build, 20-file dist/ZIP checks, two secret scans and production MV3 load |

Real Chromium controlled path:

- Eight visible English sentences formed the old batch. After the first two results arrived, the page jumped to the bottom viewport.
- The remaining six old-viewport sentences stayed untranslated, demonstrating that the stale batch stopped applying results.
- The companion received `fr-catching-up`, displayed the bilingual catch-up message path, and the bottom current-viewport sentence translated next.
- The first browser run already proved cancellation/current-viewport priority but exposed that the normal “translating” status visually masked the catch-up message. The UI was corrected so error state remains highest priority, catch-up message comes next, then normal translation status. The targeted rerun and final 20-test suite passed.

Artifacts and commits:

- Implementation commit: `5879d3d` (`feat: prioritize current viewport after rapid scroll`).
- Release candidate: `release/FloatRead-v0.5.0.zip`, 446,647 bytes.
- SHA-256: `e53cb85aede3f00f787d7febc05c59747c4621496c5d03498f6a7af92f04117d`.
- Stable rollback remains `release/FloatRead-v0.4.1.zip` / tag `stable-v0.4.1`.

Project-loop conclusion:

- Actual improvement: fast navigation no longer lets an unfinished old viewport monopolize the translation lane; current reading position becomes the next bounded batch.
- Preserved invariants: explicit activation, one current batch, direct-text replacement, immediate Stop, no hidden-tab batches, same Provider/cache identity and no new permission.
- Remaining observation: real mouse-wheel/touchpad feel and the subjective 0.85-screen threshold require owner use on live X/TED/Reddit. Automation proves the state transition and rendered response, not the owner's preferred sensitivity.

## Version 0.5.0 non-X site activation repair — 2026-07-23

Object and acceptance gap:

- X loaded automatically because it is a declared Manifest site, while TED depended on a temporary user gesture.
- The simplified Popup had removed the only discoverable activation action, so a normal user could not see how to enable TED.
- Stable 0.4.1 remains unchanged; this repair is confined to `feature/automatic-memory-v0.5.0`.

Implemented change:

- Popup now shows “在当前网站启用 / Enable on this site” when the active HTTPS origin has not been enabled.
- The click explains and requests only `${origin}/*`; denial leaves the page untouched and displays a local explanation.
- After approval, Background verifies the permission, registers the packaged Content Script for that exact origin with session persistence, injects the current tab immediately and clears any previous site pause.
- X/Twitter retain their declared automatic path. Registered sites and active translation jobs remain keyed per tab/origin; this does not impose a one-site limit.
- Service Worker recovery now also reconnects open tabs belonging to explicitly registered sites.

Regression evidence:

| Command                 | Actual result                       |
| ----------------------- | ----------------------------------- |
| `pnpm lint`             | Passed, zero warnings               |
| `pnpm typecheck`        | Passed                              |
| `pnpm test`             | Passed: 28 files, 145 tests         |
| `pnpm test:integration` | Passed: 2 files, 2 tests            |
| `pnpm build`            | Passed production MV3 build         |
| `pnpm test:e2e`         | Passed: 20 Chromium extension tests |
| `pnpm package`          | Passed packaging and release checks |

Project-loop conclusion:

- Actual improvement: TED and other HTTPS sites now have an understandable, explicit activation path instead of relying on an undiscoverable shortcut.
- Preserved invariants: exact-origin permission, packaged code only, no automatic page reading before approval, one Shadow DOM host, X behavior unchanged and no broad permanent `<all_urls>` permission.
- Remaining owner check: reload the development extension, open TED, click “在当前网站启用”, accept Chrome's prompt, then verify the pet appears immediately and after one TED page reload.
- Implementation commit: `9bf9921` (`fix: enable FloatRead on explicit non-X sites`).
- Updated release candidate: `release/FloatRead-v0.5.0.zip`, 698,400 bytes, SHA-256 `f06968aa2423a07f0fb0d02b117790b17a1aad8c115bfa328ebef888d9ff50ae`.
