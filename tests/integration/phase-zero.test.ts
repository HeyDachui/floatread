import { describe, expect, it } from "vitest";
import { createManifest } from "../../src/manifest";

describe("phase zero extension contract", () => {
  it("points to the packaged trusted contexts", () => {
    const manifest = createManifest("0.1.0");
    expect(manifest.background.service_worker).toBe("background/service-worker.js");
    expect(manifest.action.default_popup).toBe("src/popup/index.html");
    expect(manifest.options_page).toBe("src/options/index.html");
  });
});
