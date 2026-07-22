# FloatRead 0.5.0 verification report

Date: 2026-07-23
Status: automated release candidate ready for owner testing; 0.4.1 remains the owner-accepted stable version.

## Delivered outcome

FloatRead now uses one automatic 10 MB local translation-memory service for page translation and selection reading. Recent results and repeated long-term results each target about 5 MB and may borrow unused space from each other. Eligible functional text and short phrases enter recent memory, then move to long-term memory after the third encounter.

The user no longer chooses TTL, entry count or MB. Settings exposes only automatic local storage, current browser session or off; it shows recent/long-term usage, reuse count, conservative estimated Token savings and a clear action.

The accepted 0.4.1 translation, Stop, visible-only scanning, Provider, permission, Token-ledger and pet paths were intentionally held constant.

## Version isolation and recovery

| Purpose                                                 | Git reference                     | Commit    |
| ------------------------------------------------------- | --------------------------------- | --------- |
| Owner-tested stable baseline                            | `main`, tag `stable-v0.4.1`       | `fbd1487` |
| Automatic-memory implementation                         | `feature/automatic-memory-v0.5.0` | `ec8175c` |
| Rapid-scroll current-viewport priority and pet feedback | `feature/automatic-memory-v0.5.0` | `5879d3d` |

Stable installer: `release/FloatRead-v0.4.1.zip`
Stable SHA-256: `f46c9872ee611ba9142e90a4f1cb4732dcccd1f46cd5b25a26a75d62a664498d`

No 0.5.0 code was committed to `main`. Returning to 0.4.1 requires loading the preserved 0.4.1 archive or checking out `stable-v0.4.1`.

## Memory behavior

- Total automatic budget: 10,000,000 bytes.
- Recent target: about 5,000,000 bytes; 30-day lifetime.
- Long-term target: about 5,000,000 bytes; up to one year.
- Soft allocation: a tier may borrow unused capacity. At total overflow, the borrowing tier is reclaimed first; recent entries otherwise leave before long-term entries.
- Promotion: UI text or source text up to 240 characters is eligible; two cache hits after initial storage promote it on the third encounter.
- Identity: source/target language, reading mode or page-segment kind, Provider kind/origin, model, Prompt version and page-quality level remain in the hash key.
- Stored content: generated translation and non-secret metadata. API keys and original source text are not stored in this database.
- Failure behavior: read/write/corruption failure becomes a cache miss and never blocks translation or creates an extra retry loop.
- Upgrade behavior: legacy 0.4.x page records migrate only when requested, in the existing bounded page batch; unrequested or failed records remain available for later migration.

## Actual verification

| Command                           | Actual result                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm format:check`               | Passed                                                                                       |
| `pnpm lint`                       | Passed, zero warnings                                                                        |
| `pnpm typecheck`                  | Passed                                                                                       |
| `pnpm test`                       | Passed: 27 files, 138 tests                                                                  |
| `pnpm test:integration`           | Passed: 2 files, 2 tests                                                                     |
| `pnpm test:e2e`                   | Passed: 20 real Chromium MV3 tests                                                           |
| `pnpm run ci`                     | Passed end-to-end after the final UI locator correction                                      |
| `pnpm build` / `pnpm verify:dist` | Passed; 20 production files                                                                  |
| `pnpm package`                    | Passed: build, dist verification, two secret scans, ZIP verification and production MV3 load |
| `pnpm test:release-load`          | Passed: Service Worker plus Popup, Settings and Onboarding loaded                            |
| `pnpm scan:secrets`               | Passed across 641 tracked/build/archive text files                                           |

New controlled tests prove promotion, tier borrowing/reclamation, long-term protection, Token-savings statistics, requested-key-only legacy migration, rapid-scroll cancellation/debounce/cooldown and the simplified settings surface. Chromium also proves that a partially completed old batch stops, the pet displays its catch-up reaction and the current viewport translates next. Existing tests still prove Stop, cancel, original-source precision reading, visible-page translation, no automatic reload restart, Popup, skin/pet, keyboard and reduced-motion paths.

One baseline-only observation is retained honestly: the first untouched-0.4.1 full E2E run passed 18 assertions but timed out closing Chromium in the final `afterAll`; the final test passed immediately when rerun alone. The final 0.5.0 suite later passed 19/19 in one run.

## Release artifact

- Production directory: `E:\AI-900\FloatRead\dist`
- Installer: `E:\AI-900\FloatRead\release\FloatRead-v0.5.0.zip`
- Size: 446,647 bytes
- SHA-256: `e53cb85aede3f00f787d7febc05c59747c4621496c5d03498f6a7af92f04117d`
- ZIP inventory: 20 extension runtime files; no tests, `.env`, `.secrets`, source maps, logs or `node_modules`.
- Manifest: MV3, version 0.5.0, unchanged permission set, local-only extension CSP and no `unlimitedStorage` permission.

## Installation

1. Extract `release/FloatRead-v0.5.0.zip` into a permanent folder.
2. Open `chrome://extensions` and enable Developer mode.
3. Press **Load unpacked** and select the extracted folder containing `manifest.json`.
4. When replacing 0.4.1, press **Reload** on the FloatRead card and refresh the target webpage.
5. Open Settings → Automatic local memory. The default should be automatic/recommended; no TTL, entry-count or MB controls should appear.

## Manual owner check still required

The package is ready for owner testing, but 0.5.0 has not yet been observed by the owner on an authenticated live X/TED/Reddit session. Before calling 0.5.0 the new stable version:

1. Translate a page and confirm Stop remains immediate.
2. Revisit the same short menu/functional phrase three times.
3. Confirm Settings shows it under long-term memory and the reuse/Token estimate increases.
4. Confirm ordinary new post content remains under recent memory.
5. Clear local memory and confirm Provider configuration/API Key remains intact.
6. Confirm page responsiveness is unchanged on a long X timeline.

Until that check is complete, `stable-v0.4.1` remains the formal stable baseline and 0.5.0 is an installable release candidate rather than an owner-observed stable release.

## Acceptance classification

- Formal existence: passed.
- Functional operation: passed through production build, ZIP verification and MV3 load.
- Automated quality: passed within the unit/integration/Chromium/security scope above.
- Real production observation: unknown for 0.5.0; passed previously for stable 0.4.1 on owner-tested X and TED.
- Highest justified status: ready for owner testing, not yet promoted to stable.
