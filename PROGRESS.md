# FloatRead development progress

This file is the auditable project status source. A phase is only marked complete after its stated checks have actually run and its commit exists.

## Current status

- Current phase: Phase 2 — complete; Phase 3 next
- Workspace boundary: this repository root
- Repository status: independent Git repository initialized on `main`
- Product specification: `docs/source/FloatRead_Codex_Development_Spec_V1.md`
- Local smoke-test secret: `.secrets/FloatRead-APIKEY.txt` (ignored; contents unread)
- Real API status: not eligible for use; Mock and preflight checks must pass first

## Phase ledger

| Phase | Status      | Commit                                     | Verification                                                           |
| ----- | ----------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| 0     | Complete    | `6573a7680abb5b7573b1d58deb64f159f1ed7a3b` | Lint, typecheck, unit, integration, build and dist verification passed |
| 1     | Complete    | `be39d18ee6fbdb9bd61ec496ba945097c5274829` | 11 unit tests and 2 real Chromium extension E2E tests passed           |
| 2     | Complete    | This phase commit (see Git log)            | 23 unit, 2 integration and 4 real extension E2E tests passed           |
| 3     | Not started | —                                          | —                                                                      |
| 4     | Not started | —                                          | —                                                                      |
| 5     | Not started | —                                          | —                                                                      |
| 6     | Not started | —                                          | —                                                                      |
| 7     | Not started | —                                          | —                                                                      |

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

Phase 3 will implement provider adapters and routing, secret-storage modes, optional provider host permissions, settings validation and connection testing. A real credential remains out of scope until all provider preflight tests and a production build pass.
