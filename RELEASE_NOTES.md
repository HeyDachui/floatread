# FloatRead 0.3.4 visible-first translation release notes

FloatRead 0.3.4 makes page translation truly visible-first. It scans only text intersecting the current viewport, ignores clipped accessibility-only text, prioritizes article content over navigation, and writes each validated streamed translation immediately instead of waiting for a complete batch.

## Highlights

- Click the companion with no selection, or use the Popup, to translate visible page text.
- Main/article content receives natural precision translation; menus, navigation and buttons use concise UI translation.
- New visible text is translated as the user scrolls; infinite timelines are never preloaded.
- A bounded persistent local translation memory reuses repeated menu labels.
- Stop aborts the live batch and ignores late results; Resume continues; Clear restores surviving originals and disables the site preference.
- Selection-based Natural Chinese, Key Points and Explain Terms remain available for focused reading.
- Companion size now ranges from 32–120px; the result panel supports up to 760px and direct width/height resizing.

## Install

Extract `release/FloatRead-v0.3.4.zip`, then load the extracted directory at `chrome://extensions` using **Load unpacked**. When updating the workspace build, press **Reload** once. The adjacent `.sha256` and `-files.txt` files are generated and verified by `pnpm package`.

## Verification status

Automated results and exact commands are recorded in `PROGRESS.md`. This round made no real Provider call and consumed no new tokens. The earlier DeepSeek `deepseek-v4-flash` smoke remains historical Provider evidence; real-X latency and visual quality still require the owner's post-reload check. Complete `MANUAL_TESTING.md` before store publication.

## Known release prerequisites

- Replace provisional branding URLs with the canonical public repository/author identity.
- Capture approved screenshots from a real unpacked production build with no secret visible.
- Perform the human X regression checklist; automated semantic-fixture E2E is not labeled as manual X acceptance.
