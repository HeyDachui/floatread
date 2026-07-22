# FloatRead 0.4.0 adaptive translation release notes

FloatRead 0.4.0 adds Fast, Smart and Precise page translation, local detected-language choices, hidden-tab Token protection, enhanced X/TED/Reddit semantics and a naturally animated built-in Mochi companion.

## Highlights

- Smart is recommended for mixed page content; Fast reduces polishing and batches more visible text; Precise retains the previous context-focused behavior.
- Detected languages can be translated once, remembered for the current site or ignored. Detection itself makes no Provider call.
- Hidden tabs submit no new page batches. One already-submitted batch may finish; returning resumes only if the user did not press Stop.
- X, TED and Reddit receive semantic page profiles. TED live captions and timers are excluded; generic pages retain the active-tab fallback.
- Mochi blinks, walks while dragged, turns with direction and reacts to press, ready, thinking, success and error. User-uploaded images keep the lightweight local path.
- Local usage shows input, output and total Token only; no price estimate is added.

## Install

Extract `release/FloatRead-v0.4.0.zip`, then load the extracted directory at `chrome://extensions` using **Load unpacked**. When updating an existing workspace build, press **Reload** once and refresh the open site tab.

## Verification status

Lint, strict typecheck, 129 unit tests, 2 integration tests and 18 real Chromium extension tests passed. DeepSeek `deepseek-v4-flash` returned all six strict segments in one Fast and one Precise streaming request, using 515 and 516 total Token respectively. Fast finished in 1.909 seconds in this sample, but network variance meant it was not faster than Precise in this single small batch; a same-page manual comparison remains required. The production build, 20-entry ZIP inventory, secret scans and MV3 load test passed.

Release archive: `release/FloatRead-v0.4.0.zip`, 443,368 bytes, SHA-256 `585a909944c9568a633f56328220283dc6876b4ad5ca35c7baa4b91b3fcbea0f`.

## Known release prerequisites

- Replace provisional branding URLs with the canonical public repository/author identity.
- Capture approved screenshots from a production build with no credential visible.
- Complete real X, TED and Reddit observation; semantic fixture E2E is not presented as manual platform acceptance.
