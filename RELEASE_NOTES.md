# FloatRead 0.2.3 safety release notes

FloatRead 0.2.3 is an urgent safety release. It removes 0.2.2's immediate React text-node reapplication, coalesces dynamic-page scans, reduces normal batches to six segments / 6,000 characters, makes Stop persistent, aborts the Background job independently, and prevents every reload-time automatic restart.

## Highlights

- Click the companion with no selection, or use the Popup, to translate visible page text.
- Main/article content receives natural precision translation; menus, navigation and buttons use concise UI translation.
- New visible text is translated as the user scrolls; infinite timelines are never preloaded.
- A bounded persistent local translation memory reuses repeated menu labels.
- Stop aborts the live batch and ignores late results; Resume continues; Clear restores surviving originals and disables the site preference.
- Selection-based Natural Chinese, Key Points and Explain Terms remain available for focused reading.
- Companion size now ranges from 32–120px; the result panel supports up to 760px and direct width/height resizing.

## Install

Remove or reload 0.2.2 before returning to X. Extract `release/FloatRead-v0.2.3.zip`, then load the extracted directory at `chrome://extensions` using **Load unpacked**. The adjacent `.sha256` and `-files.txt` files are generated and verified by `pnpm package`.

## Verification status

Automated results and exact commands are recorded in `PROGRESS.md`. A real DeepSeek `deepseek-v4-flash` strict two-segment page batch passed in addition to connection/ordinary/stream/cancel smoke tests; no output body or credential was recorded. Complete `MANUAL_TESTING.md` before store publication.

## Known release prerequisites

- Replace provisional branding URLs with the canonical public repository/author identity.
- Capture approved screenshots from a real unpacked production build with no secret visible.
- Perform the human X regression checklist; automated semantic-fixture E2E is not labeled as manual X acceptance.
