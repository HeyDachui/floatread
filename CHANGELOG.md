# Changelog

All notable changes are documented here. The project follows semantic versioning after the first public release.

## [0.4.1] - 2026-07-22

### Fixed

- Restore the original page text before precision reading when the user selects text that FloatRead has already replaced with a page translation.
- End a precision-reading spinner with a clear retryable error when its Manifest V3 Port disconnects, and create a fresh connection on Retry.
- Make Stop update locally and immediately even when the precision-reading or page-translation Port is already dead.

### Verified

- Add the reported `@ChatGPTapp writing feature` selection-source regression, disconnected precision-client tests, dead-Port Stop tests and a real Chromium translated-page-to-Natural-Chinese flow.

## [0.4.0] - 2026-07-22

### Added

- Add Fast, Smart (recommended) and Precise page-translation levels with separate Prompt/cache identities and bounded batch sizes.
- Prompt when a visible, locally detected language is not selected; users can translate once, remember it for the current site or ignore it without sending text before consent.
- Add semantic page profiles for X, TED and Reddit while preserving the generic-page fallback and avoiding TED live caption/timer regions.
- Pause new scans and Provider batches while a tab is hidden, allow an already submitted batch to finish, and resume only when the user returns without having explicitly stopped.
- Give the built-in Mochi pet natural blink, drag-walk, turn, press and state reactions while keeping user-uploaded single images on their existing lightweight path.

### Changed

- Migrate existing 0.3.x users to Precise page translation so the previous behavior is preserved; fresh settings recommend Smart.
- Continue showing Token only—input, output and total per Start-to-Stop session—with no price estimate.

### Verified

- Add strict schema migration, quality Prompt, site-language decision, hidden-tab, platform-profile and pet-motion regressions.

## [0.3.5] - 2026-07-22

### Fixed

- Preserve genuine proper nouns while translating ordinary descriptive words in the same display name or phrase; bump the page Prompt/cache version so older skipped results are not reused.
- Send a bounded heartbeat during active Provider page jobs so Manifest V3 does not discard an otherwise quiet long-lived connection.
- Reconnect an active page automatically after a transient Background restart, resend unfinished visible text and retain already-applied translations.
- Resume the same local usage session after reconnection instead of resetting its request and Token totals.

### Verified

- Add protocol, mixed-name Prompt, transient-Port reconnect and usage-session resume regressions.

## [0.3.4] - 2026-07-22

### Fixed

- Restrict page translation to text intersecting the current viewport instead of preloading a 280-pixel margin above and below it.
- Exclude clipped, hidden and accessibility-only text more reliably by measuring each text node rather than a large parent box.
- Prioritize visible article content before navigation and menu labels, so the first request works on the text the user is reading.
- Stream validated translation items back as each JSON item completes instead of waiting for the entire batch response.

### Verified

- Add strict below-viewport scanner and real Chromium extension regressions.
- Add incremental JSON item parsing, early write-back and DeepSeek streaming usage tests.

## [0.3.3] - 2026-07-22

### Fixed

- Repair already-open declared-site tabs whenever the Manifest V3 Service Worker starts, including same-version unpacked-extension reloads that do not reliably emit `runtime.onInstalled`.
- Derive recoverable site patterns from the built manifest instead of maintaining a second hard-coded list.

### Verified

- Add a Service Worker startup regression proving open-tab recovery runs without an install/update event.
- Keep healthy tabs untouched and retain the existing serialized stale-context reinjection checks.

## [0.3.2] - 2026-07-22

### Fixed

- Keep page-translation progress visible instead of hiding the only status after 2.5 seconds.
- Surface the actual Provider, permission, credential, network or response error beside the companion and provide a direct Settings action.
- Explain the zero-result state when no visible text matches the configured source languages.
- Clarify that a session-only or enter-each-time API Key may need to be entered again after its extension session ends.

### Verified

- Add a browser regression proving a page error remains visible beyond the former toast timeout and exposes recovery.

## [0.3.1] - 2026-07-22

### Fixed

- Recover X tabs that were already open when an unpacked extension build was installed or reloaded. FloatRead now probes the existing Content Script, reinjects only when the old context is missing, and replaces an inert leftover Shadow DOM host.
- Make a normal pet click consistently start or stop full-page translation even when text is still selected. Precision reading remains available from the pet's right-click menu, the browser selection menu and the keyboard.
- Avoid injecting duplicate Content Scripts into healthy tabs and serialize concurrent recovery injection for the same tab.

### Verified

- Add deterministic tests for stale-host replacement, healthy-context reuse, stale-context reinjection and selected-text full-page startup.

## [0.3.0] - 2026-07-22

### Added

- Record each page-translation session from explicit Start to Stop, including Provider/model, source and target languages, requests, cache hits, translated segments, input tokens, output tokens and total tokens. Records stay local and can be cleared.
- Let users select one to five source languages and one target language. The local scanner reports detected languages and sends only user-selected language families for translation.
- Add Mochi, an original transparent pet character, as the default companion with idle, ready, thinking, success, error and press feedback.
- Add local PNG/JPG pet creation: bounded validation, connected light-background removal, automatic crop, WebP conversion, preview, naming and safe installation through the existing code-free skin engine.
- Add regression tests for concurrent usage accounting, language selection, pet background removal, custom-pet creation and the complete browser upload flow.

### Changed

- Simplify Popup to global enable/disable, current-site enable/disable, recent usage, active skin and Settings.
- Put DeepSeek first and recommended. The normal settings view now shows only AI service, model, API Key and storage mode; service address and timeout are under Advanced, with 30 seconds as the default.
- Keep interface languages limited to Simplified Chinese and English while page translation supports additional languages.
- Increase the fresh-install companion size to 76 px; users can still adjust it from 32–120 px.

### Safety

- Serialize local usage mutations so simultaneous tabs cannot overwrite each other's counters.
- Gate page batches on usage-session initialization so the first request cannot escape accounting.
- Bump the multilingual page prompt/cache version and preserve the existing bounded scanning, immediate cancellation and no-auto-restart rules.
- Disable both orb and image-pet motion when the operating system requests reduced motion.

## [0.2.3] - 2026-07-21

### Safety fix

- Removed the immediate character-data rewrite loop introduced in 0.2.2; FloatRead no longer fights React for the same text node.
- Observe only added/removed DOM nodes, coalesce mutation scans instead of continuously resetting timers, and use six-segment / 6,000-character normal batches. A single bounded long-form node can still use the 12,000-character protocol ceiling.
- Stop now disables the origin preference and aborts the Background job independently; a reload never auto-restarts page translation.
- Added a sustained DOM-mutation stop test and a reload test proving translation stays off until the user starts it again.

### Status

- Version 0.2.2 is superseded and should not be used on X.

## [0.2.2] - 2026-07-21

### Fixed

- Immediately reapply a known translation when a dynamic React page resets the same text node to its exact original value.
- Retry one malformed or retryable page-batch completion once; non-retryable credential/configuration failures are never retried.
- Include short English fragments inside semantic `lang` containers and additional menu/dialog roles.
- Raise the bounded page batch to 12,000 characters for long-form posts while retaining the 12-segment cap.

### Verified

- Added deterministic tests for React-style node reset, one-retry termination, short language fragments, long-form bodies and the updated protocol limit.

## [0.2.1] - 2026-07-21

### Fixed

- Translate multiline text nodes without dropping valid Provider results during safe write-back.
- Include English-dominant mixed-language posts instead of rejecting every node containing Han characters.
- Raise the supported page segment from 1,500 to 6,000 characters and increase the matching JSON output budget.
- Request JSON-object responses from DeepSeek/OpenAI-compatible page batches for more reliable parsing.

### Verified

- Added regression coverage for multiline whitespace, mixed-language bodies and exact original restoration.
- Re-ran the minimal DeepSeek page batch with JSON mode: 2 segments, 216 input tokens and 38 output tokens; no response body or credential recorded.

## [0.2.0] - 2026-07-21

### Changed

- Replaced the selection-first primary flow with explicit per-origin visible-page translation.
- Added bounded semantic text scanning, progressive dynamic-content observation and content/UI classification.
- Added strict-JSON page batches through Background and a 2,000-record persistent local translation memory.
- Added Popup and companion Start/Stop/Resume/Clear controls with live progress.
- Expanded companion size to 32–120px and result width to 760px; result panels are directly resizable.

### Fixed

- Cancelled precision-reading requests can no longer be revived by late buffered stream events.
- Dynamic host applications that replace translated text nodes no longer retain stale translation references.

### Verified

- Real DeepSeek V4 Flash strict two-segment page batch, without recording translated text or credentials.

## [0.1.0] - 2026-07-20

### Added

- Isolated floating reading companion with selection-only user-triggered generation.
- Natural Chinese, Key Points and Explain Terms modes with injection-resistant prompts.
- Six direct Provider adapters plus ordinary/streaming responses, cancellation, one bounded retry and normalized errors.
- Three credential modes, exact optional host authorization and settings connection test.
- Versioned TTL/LRU local cache and schema migrations.
- Six built-in skins and secure code-free community skin import/export.
- Popup, onboarding, current-site/global pause, context menu and keyboard shortcuts.
- Chinese/English UI, keyboard accessibility, dark appearance and reduced-motion support.
- Unit, integration, real Chromium extension E2E, distribution verification, secret scan and release ZIP verification.

### Security

- Closed production Shadow DOM, pure-text model output, runtime message validation and trusted credential boundary.
- Release checks reject dynamic execution, remote scripts, source maps, tests, environment files, local secrets and mismatched ZIP contents.
- DeepSeek V4 requests explicitly disable default Thinking mode so a small output budget cannot be consumed before final text is returned.
