# FloatRead 0.1.0 final verification report

Report date: 2026-07-20

Audited workspace: `E:\AI-900\FloatRead`

Release version: `0.1.0`

## 1. Completion overview

FloatRead is implemented as a strict-TypeScript Chrome Manifest V3 extension with no developer backend. The complete selection-only flow works through the isolated floating companion, Background-owned Mock/real Provider architecture, streaming result panel, settings, Popup, onboarding, cache and skin engine. Production code, automated tests, open-source documentation and a verified installable ZIP are present in one independent Git repository.

## 2. Implemented features

- One fixed-position page host with a closed production Shadow DOM; no post injection, X selector dependency, global CSS or timeline observer.
- Selection-only Natural Chinese, Key Points and Explain Terms modes with user-gesture enforcement and injection-resistant prompts.
- Drag, left/right snap, saved proportional position, viewport correction, sizing/opacity, outside-click collapse and edge-aware scrolling panel.
- Streaming, loading, cancel, retry, copy, last-result shortcut, source view, structured errors and bounded retry.
- OpenAI, OpenAI Compatible, DeepSeek, Anthropic Claude, Google Gemini and Ollama adapters behind a Background-only router.
- Three credential modes, exact-origin optional permissions, connection testing, credential clearing and redacted diagnostics.
- Versioned SHA-256 cache keys, TTL, LRU/capacity limits, usage display, clearing, migration and corrupt-record isolation.
- Six built-in skins, five visual states, live preview, import/export/default restore/migration and code-free archive validation.
- Popup, per-origin/global pause, page show/hide, context menu, three shortcuts and local-only onboarding demo.
- Chinese/English UI, keyboard focus behavior, light/dark compatibility and reduced-motion handling.

## 3. Repository structure

```text
FloatRead/
├── .github/workflows/       # read-only CI
├── docs/                    # architecture, permissions, Providers, skins, threat model, source spec
├── public/_locales/         # Chrome locale catalogs
├── scripts/                 # build, dist/release verification, secret scan, production load smoke
├── src/
│   ├── background/          # trusted request, command, permission and routing boundary
│   ├── cache/               # versioned session/IndexedDB result cache
│   ├── companion/           # closed-Shadow floating UI and reader state
│   ├── content/             # selection, mount, viewport and generation client
│   ├── i18n/                # typed runtime catalog
│   ├── options/             # settings and onboarding
│   ├── popup/               # toolbar controls
│   ├── prompts/             # mode prompts and untrusted-data boundary
│   ├── providers/           # six independent adapters and stream parsers
│   ├── security/            # centralized redaction
│   ├── shared/              # typed/runtime-validated protocols
│   ├── skins/               # definitions, schema, package validation and storage
│   └── storage/             # settings, profiles, credentials and site pauses
├── tests/{unit,integration,e2e}/
├── dist/                    # generated production extension (ignored)
└── release/                 # generated ZIP, inventory and digest (ignored)
```

## 4. Phase commits

| Phase | Commit                                     | Subject                                     |
| ----- | ------------------------------------------ | ------------------------------------------- |
| 0     | `6573a7680abb5b7573b1d58deb64f159f1ed7a3b` | initialize repository and architecture      |
| 1     | `be39d18ee6fbdb9bd61ec496ba945097c5274829` | implement isolated floating companion       |
| 2     | `bcaa587ca3cdb7e60da4c8b5330c6062313ffa23` | implement mock streaming result flow        |
| 3     | `26bdd909c753b4d1f13270b8f9d8f3becab9306e` | implement providers permissions and secrets |
| 4     | `0cf1f92bb2ee206f581b817c21bf13e5e93dfdeb` | implement versioned local result cache      |
| 5     | `80ee9636f1025bdd6b3791ae028738b184f600fa` | implement secure skin engine                |
| 6     | `f93405f843fbf2b1b47f47cbc027ec900214ef66` | complete onboarding popup and i18n          |
| 7     | `2b4c95624715b0ff2715bb5532a29002bb75f212` | prepare verified open source release        |

## 5. Key architecture decisions

- Content receives only public settings/skin data and never a credential, URL, header, model or system prompt.
- Background reconstructs validated requests and owns all Provider fetch/abort/retry behavior.
- Production Shadow DOM is closed; only the E2E-specific build opens it for assertions.
- Provider protocols remain independent adapters using standard `fetch` rather than vendor SDKs.
- Keys, profiles, cache results and skin binaries use separated storage repositories.
- Model output uses React text nodes; external messages and JSON use discriminated/Zod runtime validation.
- Release verification covers bundled dependencies and published bytes, not only authored source.

## 6. Manifest permissions

| Permission                                 | Purpose                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `storage`                                  | Settings, cache, pauses, Provider profile/selected credential mode and skins. |
| `contextMenus`                             | Explicit selection actions for three reading modes.                           |
| `activeTab`                                | Temporary non-X activation after toolbar/shortcut user gesture.               |
| `scripting`                                | Mount/remove the single host in the authorized active tab.                    |
| `https://x.com/*`, `https://twitter.com/*` | Companion availability on X without internal post access.                     |
| Optional HTTPS origins                     | Exact user-selected remote Provider origin, requested at configuration time.  |
| Optional localhost/127.0.0.1               | User-controlled Ollama/local proxy.                                           |

No permanent `<all_urls>`, tabs, history, cookies, downloads, webRequest or unlimitedStorage permission is present. See `docs/PERMISSIONS.md`.

## 7. Provider support matrix

| Provider          | Ordinary    | Streaming | Cancel      | Test connection | Adapter tests |
| ----------------- | ----------- | --------- | ----------- | --------------- | ------------- |
| OpenAI Responses  | Implemented | SSE       | Implemented | Implemented     | Passed        |
| OpenAI Compatible | Implemented | SSE       | Implemented | Implemented     | Passed        |
| DeepSeek          | Implemented | SSE       | Implemented | Implemented     | Passed        |
| Anthropic Claude  | Implemented | SSE       | Implemented | Implemented     | Passed        |
| Google Gemini     | Implemented | SSE       | Implemented | Implemented     | Passed        |
| Ollama            | Implemented | NDJSON    | Implemented | Implemented     | Passed        |

Status/error mapping covers HTTP 400, 401, 403, 404, 408, 429, 5xx, timeout, abort, malformed response and network failure. Retry is limited to one attempt before any output is exposed.

## 8–10. Real API smoke tests, models and credential handling

| Provider          | Base URL                   | Model               | Connection     | Ordinary       | Stream         | Cancel         |
| ----------------- | -------------------------- | ------------------- | -------------- | -------------- | -------------- | -------------- |
| DeepSeek          | `https://api.deepseek.com` | `deepseek-v4-flash` | Passed, 976 ms | Passed, 651 ms | Passed, 772 ms | Passed, 104 ms |
| OpenAI            | —                          | —                   | Not executed   | Not executed   | Not executed   | Not executed   |
| OpenAI Compatible | —                          | —                   | Not executed   | Not executed   | Not executed   | Not executed   |
| Anthropic         | —                          | —                   | Not executed   | Not executed   | Not executed   | Not executed   |
| Gemini            | —                          | —                   | Not executed   | Not executed   | Not executed   | Not executed   |
| Ollama            | —                          | —                   | Not executed   | Not executed   | Not executed   | Not executed   |

The authorized model was `deepseek-v4-flash`. The ordinary request returned 24 characters using 317 input and 12 output tokens; model text was deliberately not recorded. Streaming returned 24 characters and cancellation produced `ABORTED`. The initial eight-token connection attempt returned `INVALID_RESPONSE` because default Thinking consumed the output budget before final `content`; the adapter was fixed to disable Thinking, unit-tested and then retested successfully.

The ignored key was read only into `FLOATREAD_TEST_DEEPSEEK_KEY` for the test process and removed in a `finally` block. No credential was echoed into source, docs, output, logs, `dist`, ZIP or this report. Other Provider adapters were not given real credentials. See `docs/REAL_API_SMOKE.md`.

## 11–13. Executed tests and unexecuted checks

| Command                                      | Actual result                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm audit`                                 | Passed; no known vulnerabilities.                                                         |
| `pnpm format:check`                          | Passed.                                                                                   |
| `pnpm lint`                                  | Passed with zero warnings.                                                                |
| `pnpm typecheck`                             | Passed.                                                                                   |
| `pnpm test`                                  | Passed: 18 files, 90 unit tests.                                                          |
| `pnpm test:integration`                      | Passed: 2 files, 2 tests.                                                                 |
| `pnpm test:e2e`                              | Passed: 13 real Chromium extension tests.                                                 |
| `pnpm build`                                 | Passed; 18 production files.                                                              |
| `pnpm verify:dist`                           | Passed; Manifest, closed Shadow DOM, file policy, no dynamic/remote/Mock production code. |
| `pnpm package`                               | Passed; rebuild, dist check, scans, ZIP, release check and production Chrome load.        |
| `pnpm verify:release`                        | Passed; 18 ZIP entries exactly match `dist`, version consistent.                          |
| `pnpm test:release-load`                     | Passed; production MV3 Service Worker plus three extension pages loaded in real Chromium. |
| `pnpm scan:secrets`                          | Passed across 178 tracked/build/archive text files after staging the smoke evidence.      |
| Consecutive `package:zip` + `verify:release` | Passed twice with identical SHA-256.                                                      |
| `pnpm smoke:deepseek`                        | Passed after the documented adapter fix: connection, ordinary, stream and cancel.         |

Not executed:

- Human checklist: `MANUAL_TESTING.md` is prepared with 58 unchecked steps. Automated E2E coverage is not mislabeled as human execution.
- Chrome Web Store upload/review: requires publisher account and finalized identity.
- Store screenshots: not fabricated; capture from a real build after publisher branding is final.

## 14–15. Security and secret checks

- Dependency audit: no known vulnerability.
- No authored/bundled `eval` or `new Function`; no remote script; local-only extension CSP.
- Production Mock strings absent; tests, maps, environment files, secrets, logs and node_modules absent from release.
- Content/public messages reject credential/network fields; saved keys are restricted to trusted contexts and never returned to Content.
- Skin tests cover schema, MIME/signature/decode, path traversal, duplicate, over-size, ratio/bomb, URL and executable-field rejection.
- Secret scan passed for Git-tracked source, `dist` and unpacked ZIP. It enumerates tracked source and does not traverse ignored `.secrets`.

## 16–18. Build artifacts

- Production directory: `E:\AI-900\FloatRead\dist`
- Release ZIP: `E:\AI-900\FloatRead\release\FloatRead-v0.1.0.zip`
- Inventory: `E:\AI-900\FloatRead\release\FloatRead-v0.1.0-files.txt`
- Digest: `E:\AI-900\FloatRead\release\FloatRead-v0.1.0.sha256`
- ZIP size: 268,464 bytes
- SHA-256: `7da4b46299585504118ad04351e556ebe40cc6de3ca10aed93a050a927a2409b`

## 19. Local installation

1. Verify the ZIP digest against the `.sha256` file.
2. Extract the ZIP into a persistent folder.
3. Open `chrome://extensions`, enable Developer mode and choose **Load unpacked**.
4. Select the extracted folder containing `manifest.json`.
5. Configure one Provider from Settings and grant its exact origin when prompted.

## 20. Human acceptance

Follow `MANUAL_TESTING.md` against the extracted production ZIP. Prioritize X layout isolation, no-request-without-action, all trigger paths, credential modes, permission denial, cancel/cache behavior, dark/reduced-motion/keyboard paths and malicious skin rejection. Record Chrome/OS, tester/date, ZIP digest and Provider/model without recording a key.

## 21–22. Known limitations and remaining work

- Publisher name, GitHub/support URLs and store assets are provisional.
- Firefox/Safari are not supported or tested in V1.
- Human regression remains pending; automated and real-API evidence are not mislabeled as human execution.
- Chrome Web Store publication is outside this local repository delivery.
- Stream quality and availability depend on the selected Provider/proxy.

No core V1 implementation item is intentionally left as a TODO or fixed production demo. Mock code is development/E2E-only and absent from production.

## 23. Suggested next release

- Finalize publisher identity, repository security contact and real screenshots.
- Run one minimal authorized smoke per priority Provider over time, never in parallel and never with committed credentials.
- Validate Edge/Brave and assess Firefox MV3 portability.
- Add signed/community-reviewed skin distribution without introducing remote execution.
- Improve Provider diagnostics while preserving exact-origin permissions and redaction.
