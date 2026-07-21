# FloatRead 0.2.3 safety verification report

Report date: 2026-07-21

Audited workspace: `E:\AI-900\FloatRead`

Release version: `0.2.3`

## 1. Completion overview

FloatRead 0.2.3 is the safety replacement for 0.2.2. The owner observed an endless translating state, ineffective Stop and a page crash with 0.2.2. That report invalidated 0.2.2's production-readiness claim. Investigation identified synchronous same-text-node reapplication and high-frequency mutation rescans as a credible contention loop with React. Version 0.2.3 removes synchronous character-data writes, observes only inserted/removed nodes, coalesces scan scheduling, reduces normal batch pressure, aborts independently in Background, persists Stop for the origin and never automatically restarts translation after reload.

The controlled Chromium path is runnable, tested and packaged. Live authenticated-X regression remains the final production-readiness gate and is not reported as passed. Provider traffic and credentials stay inside trusted extension contexts; there is no FloatRead backend, account, telemetry, advertising or payment system.

Automated delivery is complete. Human regression on the live X website and Chrome Web Store publication remain external acceptance work and are not reported as completed.

## 2. Implemented features

- One fixed FloatRead host with a closed production Shadow DOM; FloatRead UI styles remain isolated.
- User-enabled, per-origin progressive page translation of visible/near-visible text, with content/UI classification and dynamic-content observation only while active.
- Stop, resume and clear controls. Stop aborts the active batch and rejects late results; clear restores original text for surviving nodes and disables that origin's translation preference.
- Persistent, hashed translation memory for repeated menu/UI and content segments, bounded to 2,000 records.
- Selection-based Natural Chinese, Key Points and Explain Terms precision modes with injection-resistant prompts.
- Dragging, edge snap, saved position, viewport correction, 32–120 px companion size, opacity, and a result panel configurable to 760 px and directly resizable.
- Streaming, cancel, retry, copy, source view, cache, understandable errors, Popup, onboarding, context menu, shortcuts, bilingual UI, keyboard access, reduced motion, and light/dark compatibility.
- OpenAI, OpenAI Compatible, DeepSeek, Anthropic Claude, Google Gemini and Ollama adapters behind a Background-only router.
- Session, persistent-local and prompt-each-time credential modes; exact-origin optional permissions; connection testing and credential clearing.
- Six built-in skins plus versioned, code-free skin import/export and validation.

## 3. Repository structure

```text
FloatRead/
├── .github/workflows/       # read-only CI
├── docs/                    # architecture, permissions, Providers, skins and security
├── public/_locales/         # Chrome locale catalogs
├── scripts/                 # build, smoke, scan, package and release verification
├── src/
│   ├── background/          # trusted Provider/page-batch request boundary
│   ├── cache/               # precision-reading result cache
│   ├── companion/           # isolated floating UI and reader state
│   ├── content/             # page scanner/translator and precision-reading client
│   ├── page-translation/    # batch prompt and strict result protocol
│   ├── providers/           # six independent Provider adapters
│   ├── shared/              # typed and runtime-validated protocols
│   ├── skins/               # schema, package validation and storage
│   └── storage/             # settings, credentials, pauses and translation memory
├── tests/{unit,integration,e2e}/
├── dist/                    # generated production extension (ignored)
└── release/                 # generated ZIP, inventory and digest (ignored)
```

## 4. Git commit ledger

| Stage             | Commit                                     | Subject                                     |
| ----------------- | ------------------------------------------ | ------------------------------------------- |
| Phase 0           | `6573a7680abb5b7573b1d58deb64f159f1ed7a3b` | initialize repository and architecture      |
| Phase 1           | `be39d18ee6fbdb9bd61ec496ba945097c5274829` | implement isolated floating companion       |
| Phase 2           | `bcaa587ca3cdb7e60da4c8b5330c6062313ffa23` | implement mock streaming result flow        |
| Phase 3           | `26bdd909c753b4d1f13270b8f9d8f3becab9306e` | implement providers permissions and secrets |
| Phase 4           | `0cf1f92bb2ee206f581b817c21bf13e5e93dfdeb` | implement versioned local result cache      |
| Phase 5           | `80ee9636f1025bdd6b3791ae028738b184f600fa` | implement secure skin engine                |
| Phase 6           | `f93405f843fbf2b1b47f47cbc027ec900214ef66` | complete onboarding popup and i18n          |
| Phase 7           | `2b4c95624715b0ff2715bb5532a29002bb75f212` | prepare verified open-source release        |
| Final V1 evidence | `7dc163f04b41b1ab54b79dccb4732e90bf75a5be` | record final verification report            |
| DeepSeek live fix | `1eefc8115fd4bf85e4002139102578e69af6e9c0` | verify DeepSeek V4 live integration         |
| V2 redesign       | `c69fec0c2822455e5b9e1dadd8404ceb01031898` | implement progressive page translation      |
| V2.1 reliability  | `44d6861`                                  | translate multiline and mixed page text     |
| V2.2 reliability  | `85763347a7dece3ae68c54b9aac0eb5387cd1842` | harden dynamic page translation             |
| V2.3 safety fix   | `83de8991bd8d34b71a6a6205cd79776634dfabee` | stop dynamic page translation safely        |

## 5. Key architecture decisions

- The owner-authorized V2 boundary is recorded separately in `docs/V2_PRODUCT_BOUNDARY.md`; the V1 source specification remains unchanged as historical evidence.
- The scanner processes only visible and near-viewport eligible text. Normal batches are capped at 6 segments/6,000 characters; a single long eligible node may use the 12,000-character protocol ceiling. It does not preload an infinite timeline.
- Text is classified as content or UI. Exact, validated IDs map Provider results back to text nodes; malformed or partial JSON is rejected.
- Content cannot choose Provider URLs, headers, models, prompts or credentials. Background reconstructs requests and owns permission, fetch, abort and retry behavior.
- Cancellation uses `AbortController`, generation IDs and an independent Background abort path so buffered late completion messages cannot revive stopped work. Stop also disables the origin preference, and reload never auto-starts page translation. A malformed or retryable page completion is retried at most once; non-retryable failures are not retried.
- Dynamic observation is limited to child-list changes. Scan timers coalesce, and FloatRead never synchronously fights the host over character-data mutations. A host reset may remain original until a later safe child-list or viewport rescan.
- Production Shadow DOM is closed; the E2E-only build opens it for assertions. Production Mock behavior is compiled out.
- UI strategy is code-native and operational: the Popup exposes page state and controls, the companion supplies contextual actions, and the larger resizable result panel remains dedicated to precision reading. Existing tokenized skins and restrained state feedback were preserved.

## 6. Manifest permissions and purpose

| Permission                                 | Purpose                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `storage`                                  | Settings, Provider profile, credential mode, pauses, skins, caches, origin preference and translation memory. |
| `contextMenus`                             | Explicit precision-reading actions for selected text.                                                         |
| `activeTab`                                | Temporary non-X activation after a toolbar/shortcut user gesture.                                             |
| `scripting`                                | Mount or remove the single host in an authorized active tab.                                                  |
| `https://x.com/*`, `https://twitter.com/*` | Make the companion/page translator available on X without private X selectors.                                |
| Optional Provider origins                  | Exact selected remote Provider origin, requested when configured.                                             |
| Optional localhost/127.0.0.1               | User-controlled Ollama or local proxy.                                                                        |

There is no permanent `<all_urls>`, tabs, history, cookies, downloads, webRequest or unlimitedStorage permission.

## 7. Provider support matrix

| Provider          | Ordinary    | Streaming | Cancel      | Connection test | Adapter tests |
| ----------------- | ----------- | --------- | ----------- | --------------- | ------------- |
| OpenAI Responses  | Implemented | SSE       | Implemented | Implemented     | Passed        |
| OpenAI Compatible | Implemented | SSE       | Implemented | Implemented     | Passed        |
| DeepSeek          | Implemented | SSE       | Implemented | Implemented     | Passed        |
| Anthropic Claude  | Implemented | SSE       | Implemented | Implemented     | Passed        |
| Google Gemini     | Implemented | SSE       | Implemented | Implemented     | Passed        |
| Ollama            | Implemented | NDJSON    | Implemented | Implemented     | Passed        |

HTTP 400, 401, 403, 404, 408, 429, 5xx, timeout, abort, malformed response and network failures are mapped to unified errors. Automatic retry is limited to one attempt before any output is exposed.

## 8–10. Real API smoke matrix and credential confirmation

| Provider/model                 | Connection     | Ordinary       | Stream         | Cancel         | V2 page batch                       |
| ------------------------------ | -------------- | -------------- | -------------- | -------------- | ----------------------------------- |
| DeepSeek / `deepseek-v4-flash` | Passed, 976 ms | Passed, 651 ms | Passed, 772 ms | Passed, 104 ms | Passed again in JSON mode, 1,481 ms |
| Other adapters                 | Not executed   | Not executed   | Not executed   | Not executed   | Not executed                        |

Base URL: `https://api.deepseek.com`. The page test used two harmless segments and returned the exact two-segment JSON shape. The recorded evidence contains only durations, token/character counts and result types—not response bodies or credentials.

The ignored local key was read into `FLOATREAD_TEST_DEEPSEEK_KEY` only for each smoke process and removed in `finally`. It was not copied to source, settings, docs, logs, `dist`, the release ZIP or this report. No other Provider received a real credential. The controlled initial DeepSeek Thinking-mode failure and adapter fix are documented in `docs/REAL_API_SMOKE.md`.

## 11–13. Executed tests and unexecuted checks

| Command                           | Actual result                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm audit`                      | Passed; no known vulnerabilities.                                                                  |
| `pnpm format:check`               | Passed.                                                                                            |
| `pnpm lint`                       | Passed with zero warnings.                                                                         |
| `pnpm typecheck`                  | Passed.                                                                                            |
| `pnpm test`                       | Passed: 19 files, 99 tests.                                                                        |
| `pnpm test:integration`           | Passed: 2 files, 2 tests.                                                                          |
| `pnpm test:e2e`                   | Passed: 15 real Chromium extension tests, including a 5 ms mutation storm, Stop and reload safety. |
| `pnpm build` / `pnpm verify:dist` | Passed: 18 production files; file policy and production flags verified.                            |
| `pnpm package`                    | Passed: rebuild, dist validation, two secret scans, ZIP validation and production Chrome load.     |
| `pnpm test:release-load`          | Passed: MV3 worker and three extension pages loaded in real Chromium.                              |
| `pnpm smoke:deepseek`             | Passed: connection, ordinary, stream and cancel.                                                   |
| `pnpm smoke:deepseek-page`        | Passed: strict two-segment page batch.                                                             |
| Two `package:zip` runs            | Passed with identical SHA-256.                                                                     |

Not executed:

- The live-X human checklist remains unchecked. The E2E page fixture verifies layout isolation, translation, dynamic menus, mutation-pressure Stop, reload safety and restoration, but is not represented as live-X acceptance.
- Chrome Web Store upload/review and store screenshots require the publisher account and finalized branding.
- OpenAI, Anthropic, Gemini, OpenAI Compatible and Ollama were adapter-tested, not live-key-tested.

## 14–15. Security and secret checks

- Dependency audit found no known vulnerabilities.
- No authored/bundled `eval`, `new Function`, remote script or remote execution path; extension CSP is local-only.
- Credentials remain in trusted storage contexts and are absent from public/content messages, caches and exports.
- Page-batch messages are bounded and runtime-validated; strict response parsing requires the exact requested ID set.
- Model output is assigned as text, not injected as HTML.
- Skin tests cover schema, MIME/signature, path traversal, duplicate, over-size, decompression ratio, dangerous URL and executable-field rejection.
- Secret scanning passed across tracked files, `dist` and the unpacked release ZIP; ignored `.secrets` is deliberately outside repository enumeration.

## 16–18. Build artifacts

- Production directory: `E:\AI-900\FloatRead\dist`
- Release ZIP: `E:\AI-900\FloatRead\release\FloatRead-v0.2.3.zip`
- Inventory: `E:\AI-900\FloatRead\release\FloatRead-v0.2.3-files.txt`
- Digest: `E:\AI-900\FloatRead\release\FloatRead-v0.2.3.sha256`
- ZIP size: 274,999 bytes
- SHA-256: `f665f1de544b44ae9749d615acbf50871c75282099ff7dc17af2734f8160d087`
- ZIP entries: 18; every path and byte matched the verified `dist` tree.

## 19. Local installation

1. Disable and remove 0.2.2; do not continue running it on X.
2. Extract `release/FloatRead-v0.2.3.zip` into a persistent folder.
3. Open `chrome://extensions` and enable Developer mode.
4. Choose **Load unpacked** and select the extracted folder containing `manifest.json`; confirm Chrome displays version 0.2.3, then hard-refresh X.
5. Open FloatRead Settings, choose DeepSeek, set `https://api.deepseek.com`, model `deepseek-v4-flash`, and enter the key using the preferred storage mode.
6. Grant only the displayed exact Provider-origin permission.
7. Open X and manually start page translation. Stop must abort the active batch and remain stopped after reload; translation starts again only after an explicit user action.

## 20. Human acceptance

Use `MANUAL_TESTING.md` against the extracted production ZIP. For the reported issue, first verify: visible tweet text translates; menus translate once and remain translated; scrolling progressively translates newly visible text; Stop prevents later batches; Resume continues; Clear restores current original nodes; late results never appear after Stop; and X layout/scrolling remain usable. Record Chrome/OS, tester/date and ZIP digest without recording a key.

## 21–22. Known limitations and incomplete work

- Real X behavior still needs the owner's manual run. An attempted automated live-X inspection reached Cloudflare's security-verification page and was not bypassed. Controlled Chromium fixtures cover mutation pressure, cancellation and reload safety, but do not establish live-X production readiness.
- Direct page-text replacement is intentionally invasive under the V2 authorization. FloatRead no longer immediately rewrites same-node host resets; a reset may remain English until a safe child-list or viewport rescan. Clear restores nodes that still exist, but a site framework may destroy/recreate nodes before restoration.
- Translation is progressive around the viewport, not an eager crawl of the entire infinite timeline.
- One page batch is non-streaming because it must return strict JSON for multiple segment IDs; precision-reading requests still stream.
- Publisher name, GitHub/support URLs and store assets are provisional.
- Firefox/Safari, Chrome Web Store submission and other Providers' real-key smoke tests are not completed.

No V2 core path uses a fixed production demo. Version 0.2.2 is rejected and superseded. Version 0.2.3 passes the controlled functional and quality gates; the live-site manual checklist is the remaining production-readiness gate.

## 23. Suggested next release

- Use live-X manual evidence to tune semantic priority, batch cadence and text-node restoration without adopting private X selectors.
- Add an explicit translation-language setting and per-section include/exclude controls.
- Add an optional side-by-side/original-on-hover presentation mode for sites where direct replacement is fragile.
- Run minimal authorized smoke tests for additional priority Providers, one credential at a time.
- Finalize publisher identity, repository URLs, screenshots and store listing.
