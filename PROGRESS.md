# FloatRead development progress

This file is the auditable project status source. A phase is only marked complete after its stated checks have actually run and its commit exists.

## Current status

- Current phase: Phase 0 — complete
- Workspace boundary: this repository root
- Repository status: independent Git repository initialized on `main`
- Product specification: `docs/source/FloatRead_Codex_Development_Spec_V1.md`
- Local smoke-test secret: `.secrets/FloatRead-APIKEY.txt` (ignored; contents unread)
- Real API status: not eligible for use; Mock and preflight checks must pass first

## Phase ledger

| Phase | Status      | Commit                          | Verification                                                           |
| ----- | ----------- | ------------------------------- | ---------------------------------------------------------------------- |
| 0     | Complete    | This phase commit (see Git log) | Lint, typecheck, unit, integration, build and dist verification passed |
| 1     | Not started | —                               | —                                                                      |
| 2     | Not started | —                               | —                                                                      |
| 3     | Not started | —                               | —                                                                      |
| 4     | Not started | —                               | —                                                                      |
| 5     | Not started | —                               | —                                                                      |
| 6     | Not started | —                               | —                                                                      |
| 7     | Not started | —                               | —                                                                      |

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
- No provider, UI vertical slice, cache or skin code exists yet; these belong to later phases.
- No real API call is authorized before the explicit smoke-test checkpoint.

## Next phase

Phase 1 will implement the isolated floating companion, selection manager, drag/snap behavior and fixture-driven layout isolation checks.
