# FloatRead 0.3.5 resilient translation release notes

FloatRead 0.3.5 translates descriptive words even when they share a phrase with product or person names. Active page jobs now send a lightweight heartbeat, automatically reconnect after transient Manifest V3 Background restarts and preserve the same local request/Token totals.

## Highlights

- Click the companion with no selection, or use the Popup, to translate visible page text.
- Main/article content receives natural precision translation; menus, navigation and buttons use concise UI translation.
- New visible text is translated as the user scrolls; infinite timelines are never preloaded.
- A bounded persistent local translation memory reuses repeated menu labels.
- Stop aborts the live batch and ignores late results; Resume continues; Clear restores surviving originals and disables the site preference.
- Selection-based Natural Chinese, Key Points and Explain Terms remain available for focused reading.
- Companion size now ranges from 32–120px; the result panel supports up to 760px and direct width/height resizing.

## Install

Extract `release/FloatRead-v0.3.5.zip`, then load the extracted directory at `chrome://extensions` using **Load unpacked**. When updating the workspace build, press **Reload** once. The adjacent `.sha256` and `-files.txt` files are generated and verified by `pnpm package`.

## Verification status

Automated results and exact commands are recorded in `PROGRESS.md`. The V3 page Prompt and streaming path receive one minimal DeepSeek `deepseek-v4-flash` smoke after package gates pass; no output body or credential is recorded. Real-X continuity still requires the owner's post-reload check. Complete `MANUAL_TESTING.md` before store publication.

## Known release prerequisites

- Replace provisional branding URLs with the canonical public repository/author identity.
- Capture approved screenshots from a real unpacked production build with no secret visible.
- Perform the human X regression checklist; automated semantic-fixture E2E is not labeled as manual X acceptance.
