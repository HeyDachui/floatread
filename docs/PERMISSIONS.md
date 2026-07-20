# Manifest permissions

FloatRead follows least privilege. The production Manifest is generated from `src/manifest.ts` and verified during every build.

| Manifest entry                                  | Scope                     | Purpose and trigger                                                                                                                                                                                            |
| ----------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                       | Extension data only       | Settings, cache policy/results, site pauses, Provider profiles, user-selected credential storage and skins. API keys never use sync storage.                                                                   |
| `contextMenus`                                  | Extension selection menu  | Creates localized, user-triggered Natural Chinese / Key Points / Explain Terms actions. Only Chrome's selected text is processed.                                                                              |
| `activeTab`                                     | Current tab, temporary    | Lets a toolbar or shortcut user gesture enable FloatRead on a non-X page. It is not broad tab-reading permission.                                                                                              |
| `scripting`                                     | Current authorized tab    | Injects or removes the one FloatRead Content Script host following an allowed user action.                                                                                                                     |
| `https://x.com/*`                               | X pages                   | Automatically makes the isolated companion available on X. It does not grant permission to scan posts or alter layout.                                                                                         |
| `https://twitter.com/*`                         | Legacy X pages            | Same limited companion availability on the legacy hostname.                                                                                                                                                    |
| `optional_host_permissions: https://*/*`        | Exact chosen HTTPS origin | Chrome's API exposes the declaration as a pattern, but runtime requests use `chrome.permissions.request({origins: [exactOrigin/*]})` only after explanation and explicit user action. Remote HTTP is rejected. |
| `optional_host_permissions: http://localhost/*` | Loopback only             | Local Ollama or a local proxy on a user-selected port.                                                                                                                                                         |
| `optional_host_permissions: http://127.0.0.1/*` | Loopback only             | Same local-only capability for numeric loopback.                                                                                                                                                               |

FloatRead does not request `<all_urls>` as a permanent host permission, `tabs`, `history`, `cookies`, `downloads`, `webRequest`, `debugger`, `nativeMessaging` or `unlimitedStorage`.

If a Provider origin request is denied, FloatRead shows a recoverable permission error and sends no request. Changing Base URL requires permission for the new exact origin; permission is never silently broadened.
