# Changelog

All notable changes are documented here. The project follows semantic versioning after the first public release.

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
