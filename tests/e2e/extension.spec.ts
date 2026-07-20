import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";

const projectRoot = resolve(import.meta.dirname, "../..");
const extensionPath = resolve(projectRoot, "dist-e2e");
const fixturePath = resolve(projectRoot, "tests/e2e/fixtures/page.html");
const fixtureUrl = "http://127.0.0.1:4173/";

let server: Server;
let context: BrowserContext;

async function selectFixtureSource(page: Page): Promise<void> {
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
}

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

  await selectFixtureSource(page);

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

test("streams a selected passage through Background and Mock Provider", async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1_000, height: 760 });
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await selectFixtureSource(page);

  const companion = host.locator("button.fr-companion");
  await expect(companion).toHaveAttribute("aria-label", "FloatRead：选择阅读模式");
  await companion.click();
  await host.getByRole("menuitem", { name: /自然中文/u }).click();

  const panel = host.locator(".fr-result-panel");
  await expect(panel).toBeVisible();
  await expect(panel.locator(".fr-output-text")).toHaveText(
    "我们已重置受影响的 Codex 用户的使用限额。",
  );
  await expect(panel.locator(".fr-provider-tag")).toContainText("Mock Provider");

  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error("result panel bounding box missing");
  expect(panelBox.x).toBeGreaterThanOrEqual(8);
  expect(panelBox.y).toBeGreaterThanOrEqual(8);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(1_000);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(760);

  await panel.getByRole("button", { name: "看懂重点" }).click();
  await expect(panel.locator(".fr-output-text")).toContainText("【原文没有说明】");
  await panel.getByRole("button", { name: "关闭结果面板" }).click();
  await expect(panel).toBeHidden();
  await page.close();
});

test("cancels an active stream and keeps partial content", async () => {
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await selectFixtureSource(page);

  const companion = host.locator("button.fr-companion");
  await expect(companion).toHaveAttribute("aria-label", "FloatRead：选择阅读模式");
  await companion.click();
  await host.getByRole("menuitem", { name: /解释术语/u }).click();
  const panel = host.locator(".fr-result-panel");
  await expect(panel.getByRole("button", { name: "停止" })).toBeVisible();
  await page.waitForTimeout(45);
  await panel.getByRole("button", { name: "停止" }).click();

  await expect(panel.getByText("请求已停止，已保留收到的内容。")).toBeVisible();
  await expect(panel.getByRole("button", { name: "重试" })).toBeVisible();
  await page.close();
});
