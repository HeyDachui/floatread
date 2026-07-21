# Changelog

All notable changes are documented here. The project follows semantic versioning after the first public release.

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
