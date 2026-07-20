import { describe, expect, it } from "vitest";
import { createManifest } from "../../src/manifest";

describe("manifest", () => {
  it("uses MV3 with minimum permissions and no permanent all-URLs access", () => {
    const manifest = createManifest("0.1.0");
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(["activeTab", "contextMenus", "scripting", "storage"]);
    expect(manifest.host_permissions).toEqual(["https://x.com/*", "https://twitter.com/*"]);
    expect(manifest.host_permissions).not.toContain("<all_urls>");
    expect(manifest.optional_host_permissions).not.toContain("<all_urls>");
    expect(manifest.content_scripts).toHaveLength(1);
    expect(Object.keys(manifest.commands)).toEqual([
      "run-default-mode",
      "toggle-companion",
      "copy-last-result",
    ]);
  });
});
