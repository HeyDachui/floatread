import { chromium } from "@playwright/test";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const extensionPath = resolve(projectRoot, "dist");
const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(worker.url()).host;
  if (!extensionId) throw new Error("production extension Service Worker has no extension ID");

  const pages = [
    { path: "src/options/index.html", marker: "main" },
    { path: "src/popup/index.html", marker: "main" },
    { path: "src/options/onboarding/index.html", marker: "main" },
  ] as const;

  for (const entry of pages) {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/${entry.path}`);
    await page.locator(entry.marker).waitFor({ state: "visible" });
    if ((await page.locator("body").innerText()).trim().length === 0) {
      throw new Error(`production extension page rendered no text: ${entry.path}`);
    }
    await page.close();
  }

  console.log(`Production MV3 extension loaded with ${pages.length} verified extension pages.`);
} finally {
  await context.close();
}
