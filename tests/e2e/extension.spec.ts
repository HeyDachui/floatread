import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext } from "@playwright/test";

const projectRoot = resolve(import.meta.dirname, "../..");
const extensionPath = resolve(projectRoot, "dist-e2e");
const fixturePath = resolve(projectRoot, "tests/e2e/fixtures/page.html");
const fixtureUrl = "http://127.0.0.1:4173/";

let server: Server;
let context: BrowserContext;

test.beforeAll(async () => {
  const fixture = await readFile(fixturePath);
  server = createServer((request, response) => {
    if (request.url === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(fixture);
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise<void>((resolveStarted) => server.listen(4173, "127.0.0.1", resolveStarted));
  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  if (context.serviceWorkers().length === 0) await context.waitForEvent("serviceworker");
});

test.afterAll(async () => {
  await context?.close();
  await new Promise<void>((resolveClosed, reject) =>
    server.close((error) => (error ? reject(error) : resolveClosed())),
  );
});

test("adds only one isolated host without changing fixture layout", async () => {
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  await page.locator("floatread-root").waitFor({ state: "attached" });

  const evidence = await page.evaluate(() => {
    const baseline = (
      window as unknown as {
        __fixtureBaseline: {
          documentChildren: number;
          sourceBox: DOMRect;
          sourceAttributes: Array<[string, string]>;
        };
      }
    ).__fixtureBaseline;
    const source = document.querySelector("#source");
    if (!source) throw new Error("fixture source missing");
    const currentBox = source.getBoundingClientRect().toJSON();
    return {
      roots: document.querySelectorAll("floatread-root").length,
      addedDocumentChildren: document.documentElement.children.length - baseline.documentChildren,
      sourceAttributes: Array.from(source.attributes, ({ name, value }) => [name, value]),
      sourceBox: currentBox,
      baseline,
      shadowOpen: document.querySelector("floatread-root")?.shadowRoot !== null,
    };
  });

  expect(evidence.roots).toBe(1);
  expect(evidence.addedDocumentChildren).toBe(1);
  expect(evidence.sourceAttributes).toEqual(evidence.baseline.sourceAttributes);
  expect(evidence.sourceBox).toEqual(evidence.baseline.sourceBox);
  expect(evidence.shadowOpen).toBe(true);
  await page.close();
});

test("selection changes ready state and the companion remains visible after dragging", async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1_000, height: 760 });
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });

  await page.evaluate(() => {
    const paragraph = document.querySelector("#source");
    if (!paragraph) throw new Error("fixture source missing");
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });

  const companion = host.locator("button.fr-companion");
  await expect(companion).toHaveAttribute("aria-label", "FloatRead：选择阅读模式");
  const before = await companion.boundingBox();
  if (!before) throw new Error("companion bounding box missing");
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(80, 280, { steps: 6 });
  await page.mouse.up();
  const after = await companion.boundingBox();
  if (!after) throw new Error("dragged companion bounding box missing");
  expect(after.x).toBeGreaterThanOrEqual(8);
  expect(after.y).toBeGreaterThanOrEqual(8);
  expect(after.x + after.width).toBeLessThanOrEqual(1_000 - 8);
  expect(after.y + after.height).toBeLessThanOrEqual(760 - 8);
  await page.close();
});
