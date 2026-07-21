# FloatRead 0.3 product boundary

Status: owner-confirmed implementation scope, 2026-07-21.

## Product goal

Version 0.3 turns the current engineering-oriented extension into a simpler consumer product without removing full-page translation. The software interface remains complete in Simplified Chinese and English. Page translation supports multiple selected source languages into one selected target language.

## Required changes

- Record one local usage session from explicit page-translation start through stop, including Provider requests, cache hits, input tokens, output tokens and total tokens. Missing Provider usage must be shown as unavailable rather than estimated.
- Simplify Popup to enable/pause, current-site state, current skin, local usage summary and Settings. Do not expose page-translation internals or Provider details there.
- Put DeepSeek first and make it the recommended initial service. Standard setup shows service, model, API key and the three credential-storage choices. Display name, Base URL and timeout move to Advanced; the default timeout is 30 seconds.
- Keep FloatRead UI localization limited to `zh_CN` and `en`.
- Let the user add one to five source languages with a plus control and choose one target language. Do not translate the target language or unselected languages. Show locally detected languages in the companion.
- Keep full-page translation user-triggered and retain the V2.3 safety limits: no reload auto-start, child-list-only dynamic observation, coalesced scans, independent Background cancellation and bounded batches.
- Replace the default orb emphasis with a reusable pet module. A single local PNG/JPG creates a custom pet after local white-background removal, cropping and preview. Single-image pets use built-in motion presets; bundled original pets may use authored state frames.

## Deliberate non-goals

- No FloatRead server, account, telemetry, payment or developer gateway.
- No uploading imported pet images for processing.
- No claim that one still image can create genuine new illustrated frames offline.
- No copyrighted third-party character bundled with the public release.
- No additional software-interface locales in 0.3; translation-language choices are separate from interface localization.

## Delivery order

1. Usage, language model and storage migration.
2. Popup and Settings simplification.
3. Pet import/runtime module and original bundled assets.
4. Automated, visual and release acceptance.
