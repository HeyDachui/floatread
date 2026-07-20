# Technical decisions

## D-001 — Independent workspace and repository

- Date: 2026-07-20
- Decision: all FloatRead changes live in this independent repository root.
- Reason: the parent workspace already contains unrelated material. A nested project boundary gives other tasks a deterministic audit path and phase-specific commits without committing machine-specific absolute paths.
- Reversal condition: publisher explicitly relocates the whole repository while preserving history.

## D-002 — Secret placement

- Date: 2026-07-20
- Decision: the supplied local credential file lives at `.secrets/FloatRead-APIKEY.txt`, excluded by `.gitignore` before repository initialization.
- Reason: the user requested a single auditable workspace, while the product requires credentials to stay outside source, history, logs, builds and release archives.
- Constraint: its contents will not be read until the real-provider checkpoint and will never be copied into code or documentation.

## D-003 — Direct fetch adapters

- Date: 2026-07-20
- Decision: Provider adapters will use standard `fetch`, not vendor SDKs.
- Reason: smaller extension bundles, transparent request construction, easier abort/stream testing and less supply-chain exposure.

## D-004 — Build boundaries

- Date: 2026-07-20
- Decision: Vite emits pages, the MV3 service worker and the Content Script as separately constrained entries; a typed generator owns the manifest.
- Reason: Content Scripts need a self-contained classic bundle, while the service worker can use ESM.

## D-005 — Version and license

- Date: 2026-07-20
- Decision: use version `0.1.0` and the MIT License, as specified in the authoritative product specification.

## D-006 — Branding defaults

- Date: 2026-07-20
- Decision: keep all publisher-facing links in `src/config/branding.ts` and use clearly replaceable project defaults.
- Reason: publisher identity is the only unresolved product metadata and must not block implementation or spread placeholders through the UI.

## D-007 — Release evidence

- Date: 2026-07-20
- Decision: `pnpm package` rebuilds production code, verifies `dist`, scans tracked/build files, creates a fixed-metadata ZIP, proves its entry list and bytes exactly match `dist`, writes a SHA-256/inventory, then scans the unpacked archive.
- Reason: a passing source test does not prove the published bytes are clean or complete.
- Constraint: the scanner obtains source paths from `git ls-files`; it never traverses ignored `.secrets`.

## D-008 — Honest manual and real-API status

- Date: 2026-07-20
- Decision: automated Chromium E2E is reported as E2E, `MANUAL_TESTING.md` remains an unchecked human checklist, and no real Provider is marked passed without confirmed credential ownership and a live request.
- Reason: written tests, Mock traffic and unexecuted manual steps are different evidence classes.
