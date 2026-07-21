# FloatRead Privacy Notice / 隐私说明

Effective date: 2026-07-20

## Summary

FloatRead is a local browser extension with no FloatRead-operated backend. It does not provide accounts, advertising, analytics, telemetry or hidden usage collection. The developer does not receive your API key, selected text or model output through a FloatRead server because no such server exists.

FloatRead 是一个不依赖开发者后端的本地浏览器扩展。项目不提供账号、广告、埋点、遥测或隐蔽统计。由于不存在 FloatRead 开发者服务器，开发者不会通过该服务器收到你的 API Key、选中文字或模型输出。

## Data processed

- Visible page text: read and sent directly to the selected AI Provider only after the user enables page translation for that origin. Processing is limited to visible/near-visible segments and continues progressively while enabled.
- Selected text: read only after a separate precision-reading action.
- Provider response: displayed in FloatRead's isolated panel and optionally cached locally according to settings.
- Settings and Provider profile: stored locally by Chrome. Profiles contain Base URL/model metadata but not the key itself.
- Translation usage: each explicit Start-to-Stop session stores request count, cache hits and Provider-reported input/output token totals locally. This record is shown only to the user, is never telemetry and can be cleared from Settings.
- API key: stored only in the user-selected session/local mode, or retained temporarily in Service Worker memory for enter-each-time mode.
- Page translation preference and memory: enabled origins plus bounded hashed translation records are stored locally so repeated menu labels can be reused.
- Skin packages: validated and stored locally; imports contain no permitted network URL or executable content.

FloatRead does not read browser history, downloads, cookies or unrelated tabs. It does not preload an infinite X timeline. Once page translation is enabled for an origin, currently visible and near-viewport unselected text is intentionally processed; disabling or clearing that site stops this behavior.

## API keys

API keys are stored only in the local or session storage selected by the user. FloatRead does not receive them. `chrome.storage.sync` is never used for keys. Trusted-context access restrictions are applied where Chrome supports them, and Content Scripts cannot request or receive keys.

Browser client storage is not a hardware vault and this project does not claim that keys are absolutely secure. Use a separate, low-limit, revocable key. High-security users should prefer Ollama or a local proxy they control. Removing a Provider or using **Clear credentials** deletes the corresponding session, local and in-memory values. Uninstalling the extension allows Chrome to naturally remove extension-managed data.

API Key 只保存在用户选择的本地或会话存储中，FloatRead 不会收到 Key，也不会使用 `chrome.storage.sync`。浏览器客户端存储不是硬件保险库，本项目不宣称 Key“绝对安全”。建议使用独立、低额度、可随时吊销的 Key；高安全需求用户可使用 Ollama 或自行控制的本地代理。

## Third parties

When page translation is enabled, bounded visible text batches and fixed translation instructions are sent directly to the configured Provider. Selection precision modes send only the chosen text. Provider handling, retention, billing and jurisdiction are governed by that Provider and the endpoint owner. FloatRead does not insert advertising or promotional text into requests, model output or webpages.

## Local cache and deletion

Cache keys are stable hashes of normalized text, source/target language, reading mode/segment kind, Provider kind/origin, model and Prompt version. Cached records contain generated text and metadata, never credentials. Page UI memory is bounded to 2,000 hashed records. Users can stop/clear page translation, clear local usage and result caches, remove Provider credentials, delete imported skins or restore defaults from Settings.

开启某个网站的页面翻译后，FloatRead 会处理当前可见及接近视口的未选中文字，并随滚动渐进处理新内容；不会预读无限时间线。停止会取消当前批次，清除会恢复仍存在的原文节点并关闭该网站的持续翻译偏好。

## Permissions and changes

Every Manifest permission is explained in [docs/PERMISSIONS.md](docs/PERMISSIONS.md). Material privacy changes must be documented in the changelog and release notes. Questions should use the repository support channel listed in the centralized branding configuration.
