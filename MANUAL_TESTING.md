# FloatRead manual regression checklist

This is an execution checklist, not a claim of completion. Record Chrome version, OS, build SHA-256, tester, date and evidence before a store submission. Never place an API key or private selected text in screenshots or logs.

## Test record

- Build/version:
- Chrome/OS:
- Tester/date:
- Production ZIP SHA-256:
- Test Provider/model (no key):

## X page translation and user action

- [ ] On X Home, exactly one `floatread-root` exists and the companion is visible.
- [ ] Before page translation is enabled, DevTools shows no AI Provider request and no host text changes.
- [ ] Clicking the companion starts translation with or without a leftover selection; clicking it again stops immediately.
- [ ] Settings can add 1–5 source languages and one target language; unselected languages remain unchanged.
- [ ] Visible tweet/article text is translated naturally; navigation/menu/button text is concise.
- [ ] Infinite timeline content outside the visible/near-visible window is not preloaded.
- [ ] Scrolling progressively translates newly visible posts.
- [ ] Opening a dynamic menu translates its text; reopening the same menu uses local translation memory.
- [ ] Stop immediately prevents new translations and late results cannot restart processing.
- [ ] Resume processes text that appeared while stopped.
- [ ] Clear restores surviving original text nodes and disables the site's translation preference.
- [ ] No FloatRead global stylesheet is attached to the host document; companion UI remains in its Shadow DOM.
- [ ] Select English text, right-click the companion and choose a precision mode; only the selection is used for that precision request.

## Reading workflow

- [ ] Normal page batches contain at most 6 segments / 6,000 characters; one long node may use the 12,000-character protocol ceiling; malformed JSON retries once.
- [ ] Under continuous DOM additions/removals, Stop remains clickable, aborts the request and disables restart for the origin.
- [ ] Reloading after an active translation does not automatically restart AI requests.
- [ ] Natural Chinese produces faithful natural Chinese without invented information.
- [ ] Key Points covers meaning, relevance and omissions; inference is labeled.
- [ ] Explain Terms stays grounded in current text.
- [ ] Loading appears and streamed text grows incrementally where supported.
- [ ] Cancel stops an active request and leaves a clear state.
- [ ] Retry repeats the latest selected-text request.
- [ ] Copy writes the result; copy-last shortcut works when a result exists.
- [ ] Original-text view toggles without rendering HTML.
- [ ] Errors for invalid config, denied permission, 401, 429, timeout and network failure are understandable.
- [ ] Repeating the same text/mode/Provider/model/Prompt hits cache.

## Companion and panel

- [ ] Dragging does not trigger a click and releases pointer capture safely.
- [ ] The companion snaps to left and right edges and restores its position after reload.
- [ ] It cannot remain outside the visible viewport.
- [ ] Resizing the window and changing page zoom corrects its coordinates.
- [ ] Companion size adjusts across 32–120px without leaving the viewport.
- [ ] Result width adjusts up to 760px and the panel can be resized in both dimensions.
- [ ] Clicking outside collapses the result panel.
- [ ] The panel avoids all viewport edges; long text scrolls internally.
- [ ] Keyboard Enter/Space starts or stops page translation; with a selection ready, Arrow Down opens precision actions and focus enters the menu.
- [ ] Light X, dark X, browser dark preference and `prefers-reduced-motion` all behave correctly.

## Triggers and controls

- [ ] Right-clicking selected text exposes all three localized modes.
- [ ] Default-mode shortcut runs only for a valid current selection.
- [ ] Toggle shortcut shows/removes the companion.
- [ ] Popup shows only global enable/disable, current-site enable/disable, recent local usage, active skin and Settings.
- [ ] Global pause immediately removes all open companions and resume restores allowed pages.
- [ ] Current-site pause uses only the origin and does not affect another site.
- [ ] Current-page hide/show works without changing site/global state.
- [ ] A non-X page is enabled only after the user grants temporary active-tab access.

## Settings, credentials and Provider

- [ ] Onboarding explains local architecture and completes without a network request using local demo.
- [ ] Session-only key is recommended and is not displayed after reload.
- [ ] Persistent key shows a risk warning and stays only in local extension storage.
- [ ] Enter-each-time key is lost after the Service Worker/profile session ends.
- [ ] Clear credentials and Provider deletion remove all corresponding key modes.
- [ ] Content Script messages/DOM/console never contain the key.
- [ ] Exact Provider origin permission is explained, requested and denial is recoverable.
- [ ] Connection test works for the chosen Provider/model; logs contain no secret/header.
- [ ] Ollama works on configured localhost/127.0.0.1 and remote HTTP is rejected.

## Skins, data and languages

- [ ] Mochi is the fresh-install default, remains legible at the default size and reacts to click/state changes.
- [ ] A PNG/JPG can be previewed, locally de-backgrounded, named and enabled as a custom pet.
- [ ] Internal light details are preserved when enclosed by the pet outline; the source image is never uploaded.
- [ ] Mochi plus all six earlier built-in skins switch immediately and preview five states.
- [ ] Appearance tokens affect only FloatRead's Shadow DOM/extension pages.
- [ ] Valid JSON + PNG/WebP skin imports, exports and survives restart.
- [ ] Invalid schema/MIME/extension/path traversal/duplicate/oversize/bomb/dangerous URL/executable-field packages are rejected with understandable errors.
- [ ] Exported skin/settings data contains no credentials or AI cache data.
- [ ] Cache usage/limits/clear work and corrupted records do not block startup.
- [ ] Restore defaults leaves the extension usable.
- [ ] Chinese, English and browser-auto modes update the complete settings shell; these UI choices are separate from page translation languages.
- [ ] Starting and stopping page translation creates one local usage session with request/cache and Provider-reported token totals.

## Release inspection

- [ ] Load the extracted production `release/FloatRead-v0.3.1.zip`, not `dist-e2e`.
- [ ] `manifest.json` is MV3, version matches, CSP is local-only and permissions match `docs/PERMISSIONS.md`.
- [ ] ZIP inventory contains no tests, source maps, `.env`, `.secrets`, logs, `node_modules` or unrelated screenshots.
- [ ] `pnpm scan:secrets` and `pnpm verify:release` pass after packaging.
- [ ] `pnpm test:release-load` starts the production MV3 worker and renders all three extension pages.
- [ ] `git status --short` contains no accidental credential or unrelated workspace file.
