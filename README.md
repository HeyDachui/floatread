# FloatRead

FloatRead is an open-source, serverless, bring-your-own-key page translator for Chromium browsers. Enable it once for a site to translate visible English content as you scroll; main posts receive precision translation, while menus and controls reuse persistent local translation memory. Selection reading remains available for deeper analysis.

> Current release: `0.2.0`. The publisher links bundled in this source tree are centralized provisional defaults; forks should update `src/config/branding.ts` before publishing.

[简体中文](README.zh-CN.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md) · [Manual testing](MANUAL_TESTING.md)

## What it does

- Natural Chinese: faithful, natural translation without invented information.
- Key points: what the text says, why it matters, what it omits, and clearly labeled inference.
- Explain terms: plain-Chinese explanations grounded in the selected text.
- One-click visible-page translation with progressive processing as the user scrolls.
- Precision translation for article/post content and concise translation for navigation, menus and buttons.
- Persistent, bounded local translation memory so repeated UI labels do not call the model again.
- Floating companion with drag, edge snap, viewport correction, sizing, opacity and six built-in skins.
- Streaming output, cancel, retry, copy, original-text view and bounded local cache.
- Popup controls, per-site/global pause, context menu, keyboard shortcuts and onboarding.
- Chinese/English UI, keyboard operation, dark appearance and `prefers-reduced-motion` support.
- OpenAI, OpenAI Compatible, DeepSeek, Anthropic Claude, Google Gemini and Ollama.

FloatRead has no developer server, account, payment, analytics, advertising or telemetry system. Provider requests go directly from the extension's Background Service Worker to the endpoint the user configures.

## How page translation works

After the user explicitly enables the current origin, FloatRead scans only visible and near-viewport English text. It uses semantic HTML roles rather than X's private `data-testid` values, batches at most 12 bounded segments, and translates new visible content as the user scrolls. It never preloads an infinite timeline.

Translations replace visible text-node values and can change wrapping. A restricted observer detects dynamic posts and menus; it does not modify React event handlers or X business state. Stop aborts the active batch and preserves completed translations; Clear restores surviving original text nodes and disables the site's persistent translation preference.

No page AI request is made until the user explicitly enables translation for that origin. Selection-only precision modes remain separate user actions. See the [V2 product boundary](docs/V2_PRODUCT_BOUNDARY.md).

## Screenshots

Release screenshots are intentionally not fabricated. Maintainers should capture the real unpacked production build, with no credential visible, and place approved images under `docs/assets/` before a store listing.

## Install a release build

1. Obtain `FloatRead-v0.2.0.zip` and verify its SHA-256 against the adjacent `.sha256` file.
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

Open **Settings → Provider**, choose an adapter, review the Base URL and model, select a credential mode, then grant the exact host permission and run **Test connection**. Custom services should normally use OpenAI Compatible.

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

V1 includes Native, Lens, Glass Orb, Pixel Bot, Ink and Terminal. Community packages are local ZIP-based `.floatread-skin` files containing only strict JSON and PNG/WebP. JavaScript, HTML, SVG, CSS, fonts, remote URLs and executable expressions are rejected. See [skin authoring](docs/SKINS.md).

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

The current source defaults point to the provisional [FloatRead GitHub organization](https://github.com/floatread), [repository](https://github.com/floatread/floatread) and its other open-source projects. Update the centralized branding configuration when the canonical public URLs are assigned.

## License

[MIT](LICENSE) © 2026 FloatRead Contributors.
