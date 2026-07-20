import type { ManifestV3 } from "./shared/manifest-types";

export function createManifest(version: string, isE2E = false): ManifestV3 {
  return {
    manifest_version: 3,
    name: "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    version,
    default_locale: "zh_CN",
    minimum_chrome_version: "102",
    permissions: ["activeTab", "contextMenus", "scripting", "storage"],
    host_permissions: [
      "https://x.com/*",
      "https://twitter.com/*",
      ...(isE2E ? ["http://127.0.0.1/*"] : []),
    ],
    optional_host_permissions: ["https://*/*", "http://localhost/*", "http://127.0.0.1/*"],
    background: {
      service_worker: "background/service-worker.js",
      type: "module",
    },
    content_scripts: [
      {
        matches: [
          "https://x.com/*",
          "https://twitter.com/*",
          ...(isE2E ? ["http://127.0.0.1/*"] : []),
        ],
        js: ["content/content-script.js"],
        run_at: "document_idle",
        all_frames: false,
      },
    ],
    action: {
      default_popup: "src/popup/index.html",
      default_title: "FloatRead",
    },
    options_page: "src/options/index.html",
    commands: {
      "run-default-mode": {
        suggested_key: { default: "Alt+Shift+R" },
        description: "__MSG_commandRunDefault__",
      },
      "toggle-companion": {
        suggested_key: { default: "Alt+Shift+F" },
        description: "__MSG_commandToggle__",
      },
      "copy-last-result": {
        description: "__MSG_commandCopyLast__",
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  };
}
