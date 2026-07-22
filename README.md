# FloatRead

FloatRead is a free, source-available, serverless, bring-your-own-key page translator for Chromium browsers. Translation starts only when the user clicks the companion, then progressively handles visible content in the selected source languages. Main content receives natural translation, while menus reuse persistent local translation memory. Selection reading remains available for deeper analysis.

> Current development release: `0.5.0`. The owner-tested `0.4.1` baseline remains available as Git tag `stable-v0.4.1`. Page translation defaults to English; users can select Fast, Smart or Precise, add source languages and choose one target language.

[简体中文](README.zh-CN.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md) · [Manual testing](MANUAL_TESTING.md)

## How FloatRead avoids unnecessary token use

FloatRead does not send an entire page, an infinite timeline, or every scroll event to a model again. After the user starts translation, it progressively handles the visible viewport, reuses local translations for repeated short and functional text, prioritizes the settled viewport after a fast jump, and does not submit new batches while a page is hidden. Main content uses natural translation while UI labels use concise translation.

Request counts, cache hits, and Provider-reported input/output/total tokens are recorded locally for the current Start-to-Stop session. These measures reduce avoidable requests and duplicate input; they do not promise a fixed token saving or cost because actual use depends on the page, mode, model, Provider pricing, and cache hits.

## What it does

- Natural Chinese: faithful, natural translation without invented information.
- Key points: what the text says, why it matters, what it omits, and clearly labeled inference.
- Explain terms: plain-Chinese explanations grounded in the selected text.
- One-click visible-page translation with progressive processing as the user scrolls.
- Rapid-scroll catch-up: a stale unfinished batch is cancelled after a large fast jump, then the settled current viewport is prioritized with a rate-limited pet message.
- Fast, Smart (recommended) and Precise page-translation levels; migrated users keep the previous Precise behavior.
- One to five source languages and one target language; the extension UI itself remains Chinese/English.
- A local detected-language choice: this time, always on this site, or ignore—without an AI call before consent.
- Local per-session request, cache-hit and input/output/total token accounting from Start to Stop.
- Automatic 10 MB local translation memory: repeated short/functional text can graduate from recent memory to a protected long-term tier; the two 5 MB targets borrow unused space from each other.
- Hidden pages submit no new Provider batch and resume only when the user returns without explicitly stopping.
- Enhanced semantic profiles for X, TED and Reddit, with a generic active-tab fallback elsewhere.
- Precision translation for article/post content and concise translation for navigation, menus and buttons.
- Persistent, bounded local translation memory so repeated UI labels do not call the model again.
- Floating companion with drag, edge snap, viewport correction, sizing, opacity and six built-in skins.
- Streaming output, cancel, retry, copy, original-text view and bounded local cache.
- A simplified Popup, per-site/global pause, context menu, keyboard shortcuts and onboarding.
- Chinese/English UI, keyboard operation, dark appearance and `prefers-reduced-motion` support.
- OpenAI, OpenAI Compatible, DeepSeek, Anthropic Claude, Google Gemini and Ollama.
- Mochi, an original default pet with blink, drag-walk, turn and state reactions, plus local PNG/JPG-to-pet creation and secure skin packages.

FloatRead has no developer server, account, payment, analytics, advertising or telemetry system. Provider requests go directly from the extension's Background Service Worker to the endpoint the user configures.

## How page translation works

After the user explicitly starts translation, FloatRead scans only current-viewport text in selected source languages. Detection happens locally. It uses semantic HTML rather than X private selectors. Precise, Smart and Fast cap batches at 6/6,000, 8/8,000 and 12/12,000 segments/characters respectively. New visible content is translated while scrolling; a large rapid jump cancels the unfinished stale batch and waits briefly for the new viewport to settle. Infinite timelines are never preloaded, and hidden tabs submit no new batch.

Translations replace visible text-node values and can change wrapping. A restricted child-list observer detects newly added posts and menus without continuously rewriting React-controlled character data. Stop aborts the Background batch, disables restart for the origin and preserves completed translations; Clear also restores surviving original text nodes. Reloading a page never automatically starts AI translation.

No page AI request is made until the user explicitly enables translation for that origin. Selection-only precision modes remain separate user actions. See the [V2 product boundary](docs/V2_PRODUCT_BOUNDARY.md).

## Screenshots

Release screenshots are intentionally not fabricated. Maintainers should capture the real unpacked production build, with no credential visible, and place approved images under `docs/assets/` before a store listing.

## Install a release build

1. Obtain `FloatRead-v0.5.0.zip` and verify its SHA-256 against the adjacent `.sha256` file.
2. Extract the ZIP to a permanent local folder.
3. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json`.
4. Open FloatRead settings, add a Provider, grant the exact endpoint origin when prompted, and test the connection.

Chrome's **Load unpacked** accepts the extracted directory, not the ZIP itself.

## Develop

Requirements: Node.js 20.19+ and pnpm 10+ (the repository records pnpm 11.9.0).

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm package
```

Production output is written to `dist/`; the installable archive, inventory and digest are written to `release/`. The E2E suite launches a real Chromium extension from an isolated `dist-e2e/` build.

## Provider and API key setup

Open **Settings → AI service**, choose a service and model, enter the key and select a credential mode, then Save or authorize a connection test. DeepSeek is listed first; service address and timeout are under **Advanced settings**. Custom services should normally use OpenAI Compatible.

Credential modes:

- Session only (recommended): `chrome.storage.session`.
- Persist on this browser: `chrome.storage.local`, with an explicit risk warning.
- Enter each time: Service Worker memory only; MV3 worker restarts can require re-entry.

FloatRead never receives your key, but browser client storage is not a hardware vault. Use an independent, low-limit, revocable key. For higher-security use, prefer Ollama or a local proxy you control. Keys are never placed in sync storage, Content Script messages, caches, skin exports or setting exports.

See [Provider configuration](docs/PROVIDERS.md) for protocols, defaults and Ollama setup.

## Permissions

| Permission                                 | Why it exists                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `storage`                                  | Settings, site/page-translation preferences, caches, skins and selected credential storage.  |
| `contextMenus`                             | User-triggered selection actions for the three reading modes.                                |
| `activeTab`                                | Temporary access to the current non-X page after an explicit toolbar/shortcut action.        |
| `scripting`                                | Mount or remove the single companion host after that user gesture.                           |
| `https://x.com/*`, `https://twitter.com/*` | User-enabled progressive translation of visible X text without private post selectors.       |
| Optional HTTPS origins                     | Direct requests to the Provider origin selected by the user; requested only when configured. |
| Optional localhost origins                 | Local Ollama or a local proxy controlled by the user.                                        |

FloatRead does not request history, cookies, downloads, broad tab access, webRequest or permanent `<all_urls>`. See the [full permission rationale](docs/PERMISSIONS.md).

## Privacy and security

Visible page text is sent only after page translation is enabled for that origin; selected text is sent only after a precision-reading action. Both go directly to the Provider chosen by the user under that Provider's terms. FloatRead has no developer-operated receiving server and collects no analytics. Model output is rendered as text, external JSON is schema-validated, skin packages cannot contain executable content, and production artifacts are scanned for secrets and remote code.

Read [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md) and the [threat model](docs/THREAT_MODEL.md). Do not report a vulnerability in a public issue.

## Skins

Mochi is the original default pet. Users can also drop one PNG/JPG into Settings; FloatRead locally removes border-connected light background pixels, crops the subject, converts it to transparent WebP and applies built-in motions. Native, Lens, Glass Orb, Pixel Bot, Ink and Terminal remain available. Community `.floatread-skin` packages contain only strict JSON and PNG/WebP; executable or remote content is rejected. See [skin authoring](docs/SKINS.md).

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Every code change must keep the page-isolation, secret-boundary and user-gesture invariants intact.

## Known limitations

- Chromium MV3 only; Firefox and Safari are not validated in V1.
- Chrome shortcut assignments can conflict and may need adjustment at `chrome://extensions/shortcuts`.
- A session/prompt-only key may need to be entered again after a browser or Service Worker restart.
- Streaming behavior depends on Provider/proxy capability.
- Publisher identity and repository links are provisional until the final public owner updates the centralized branding constants.
- Real Provider smoke tests are recorded separately and are never inferred from Mock tests.

## Roadmap

- Final publisher identity and store assets.
- Additional Chromium-browser compatibility validation.
- More importable, code-free community skins.
- Provider-specific diagnostics that preserve the existing privacy boundary.

## Project links

Maintainer: [HeyDachui](https://github.com/HeyDachui). Repository: [HeyDachui/floatread](https://github.com/HeyDachui/floatread). Please use repository Issues for feedback.

## License

[PolyForm Noncommercial 1.0.0](LICENSE) © 2026 FloatRead Contributors. Noncommercial use, study, modification, and sharing are welcome; commercial use requires separate permission from the maintainer. See [Commercial Use](COMMERCIAL_USE.md).
