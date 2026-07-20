import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";

const projectRoot = resolve(import.meta.dirname, "../..");
const extensionPath = resolve(projectRoot, "dist-e2e");
const fixturePath = resolve(projectRoot, "tests/e2e/fixtures/page.html");
const fixtureUrl = "http://127.0.0.1:4173/";
const readyLabel = /FloatRead(?:：选择阅读模式|: choose a reading mode)/u;
const naturalMode = /自然中文|Natural Chinese/u;

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
  await expect(companion).toHaveAttribute("aria-label", readyLabel);
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

test("shows a short hint and makes no generation when nothing is selected", async () => {
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await host.locator("button.fr-companion").click();
  await expect(host.getByRole("status")).toHaveText(
    /先选中一段需要理解的文字。|Select some text to understand first\./u,
  );
  await expect(host.locator(".fr-result-panel")).toHaveCount(0);
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
  await expect(companion).toHaveAttribute("aria-label", readyLabel);
  await companion.click();
  await host.getByRole("menuitem", { name: naturalMode }).click();

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

  await panel.getByRole("button", { name: /看懂重点|Key points/u }).click();
  await expect(panel.locator(".fr-output-text")).toContainText("【原文没有说明】");
  await panel.getByRole("button", { name: /关闭结果面板|Close result panel/u }).click();
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
  await expect(companion).toHaveAttribute("aria-label", readyLabel);
  await companion.click();
  await host.getByRole("menuitem", { name: /解释术语|Explain terms/u }).click();
  const panel = host.locator(".fr-result-panel");
  await expect(panel.getByRole("button", { name: /停止|Stop/u })).toBeVisible();
  await page.waitForTimeout(45);
  await panel.getByRole("button", { name: /停止|Stop/u }).click();

  await expect(
    panel.getByText(
      /请求已停止，已保留收到的内容。|Request stopped; received text was preserved\./u,
    ),
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: /重试|Retry/u })).toBeVisible();
  await page.close();
});

test("reuses an identical result from cache without running Mock again", async () => {
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await page.locator("#source").evaluate((element) => {
    element.textContent = "A unique cache proof passage for FloatRead.";
  });
  await selectFixtureSource(page);
  const companion = host.locator("button.fr-companion");
  await expect(companion).toHaveAttribute("aria-label", readyLabel);
  await companion.click();
  await host.getByRole("menuitem", { name: naturalMode }).click();

  const panel = host.locator(".fr-result-panel");
  await expect(panel.locator(".fr-output-text")).toHaveText(
    "Mock 自然中文：A unique cache proof passage for FloatRead.",
  );
  await expect(panel.locator(".fr-provider-tag")).not.toContainText(/缓存|cached/u);
  await panel.getByRole("button", { name: /关闭结果面板|Close result panel/u }).click();
  await companion.click();
  await host.getByRole("menuitem", { name: naturalMode }).click();
  await expect(panel.locator(".fr-output-text")).toHaveText(
    "Mock 自然中文：A unique cache proof passage for FloatRead.",
  );
  await expect(panel.locator(".fr-provider-tag")).toContainText(/缓存|cached/u);
  await page.close();
});

test("supports keyboard-first mode selection and reduced-motion rendering", async () => {
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await selectFixtureSource(page);
  const companion = host.locator("button.fr-companion");
  await expect(companion).toHaveAttribute("aria-label", readyLabel);
  await companion.focus();
  await page.keyboard.press("Enter");
  const firstMode = host.getByRole("menuitem", { name: naturalMode });
  await expect(firstMode).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(host.locator(".fr-result-panel .fr-output-text")).toHaveText(
    "我们已重置受影响的 Codex 用户的使用限额。",
  );
  const animationName = await host
    .locator(".fr-artwork")
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animationName).toBe("none");
  await page.close();
});

test("runs a selected passage from the Background action path", async () => {
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error("extension service worker missing");
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await page.locator("#source").evaluate((element) => {
    element.textContent = "A context menu proof passage.";
  });
  await selectFixtureSource(page);
  await page.bringToFront();
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (typeof tab?.id !== "number") throw new Error("fixture tab missing");
    await chrome.tabs.sendMessage(tab.id, { type: "RUN_SELECTION", mode: "key_points" });
  });
  await expect(host.locator(".fr-output-text")).toContainText("【原文没有说明】");
  await page.close();
});

test("completes the onboarding local demo without a Provider request", async () => {
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error("extension service worker missing");
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/onboarding/index.html`);
  await page.getByRole("button", { name: /开始设置|Start setup/u }).click();
  await page.getByRole("button", { name: /稍后配置|Configure later/u }).click();
  await expect(
    page.getByRole("heading", { name: /选择一个角色|Choose a character/u }),
  ).toBeVisible();
  await page.getByRole("button", { name: /运行本地演示|Run local demo/u }).click();
  await expect(page.getByRole("status")).toHaveText("我们已重置受影响的 Codex 用户的使用限额。");
  await page.close();
});

test("switches the settings interface between English and Simplified Chinese", async () => {
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error("extension service worker missing");
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  const localeSelect = page.getByLabel(/界面语言|Interface language/u);
  await localeSelect.selectOption("zh_CN");
  await expect(page.getByRole("heading", { name: "FloatRead 设置" })).toBeVisible();
  await localeSelect.selectOption("en");
  await expect(page.getByRole("heading", { name: "FloatRead settings" })).toBeVisible();
  await localeSelect.selectOption("auto");
  await page.getByRole("button", { name: /保存阅读设置|Save reading settings/u }).click();
  await expect(page.getByRole("status")).toContainText(/界面语言已保存|interface language saved/u);
  await page.close();
});

test("uses the Popup to pause, resume, hide, and show the current site", async () => {
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error("extension service worker missing");
  const extensionId = new URL(worker.url()).host;
  const fixturePage = await context.newPage();
  await fixturePage.goto(fixtureUrl);
  const host = fixturePage.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await fixturePage.bringToFront();
  const fixtureTabId = await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (typeof tab?.id !== "number") throw new Error("fixture tab missing");
    return tab.id;
  });
  const targetEvidence = await worker.evaluate(async (tabId) => {
    const tab = await chrome.tabs.get(tabId);
    return { id: tab.id, url: tab.url };
  }, fixtureTabId);
  expect(targetEvidence.id).toBe(fixtureTabId);
  expect(targetEvidence.url).toBe(fixtureUrl);
  const popupPage = await context.newPage();
  await popupPage.goto(
    `chrome-extension://${extensionId}/src/popup/index.html?targetTabId=${fixtureTabId}`,
  );
  await expect(popupPage.getByText(/此网站可用|Available on this site/u)).toBeVisible();
  const globalSwitch = popupPage.getByRole("checkbox");
  await globalSwitch.uncheck();
  await expect(host).toHaveCount(0);
  await globalSwitch.check();
  await host.waitFor({ state: "attached" });
  await popupPage.getByRole("button", { name: /暂停此网站|Pause this site/u }).click();
  await expect(host).toHaveCount(0);
  await popupPage.getByRole("button", { name: /恢复此网站|Resume this site/u }).click();
  await host.waitFor({ state: "attached" });
  await popupPage.getByRole("button", { name: /在当前页隐藏|Hide on this page/u }).click();
  await expect(host).toHaveCount(0);
  await popupPage.getByRole("button", { name: /在当前页显示|Show on this page/u }).click();
  await host.waitFor({ state: "attached" });
  await popupPage.close();
  await fixturePage.close();
});

test("saves a session-only Provider without revealing its API key", async () => {
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error("extension service worker missing");
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

  const keyInput = page.getByLabel("API Key");
  await expect(keyInput).toHaveAttribute("type", "password");
  await keyInput.fill("sk-example-not-a-real-key");
  await page.getByLabel(/显示名称|Display name/u).fill("Local test profile");
  await page.getByRole("button", { name: /^(?:保存|Save)$/u }).click();
  await expect(page.getByRole("status")).toContainText(
    /已保存并设为当前 Provider|Saved and set as active/u,
  );

  await page.reload();
  await expect(page.getByLabel("API Key")).toHaveValue("");
  await expect(page.getByText("Local test profile")).toBeVisible();

  await page.getByRole("radio", { name: /持久保存在本机|Persist on this device/u }).check();
  await expect(
    page.getByText(/浏览器调试权限的人仍可能读取|browser debugging access may still read/u),
  ).toBeVisible();
  await page.getByLabel("Base URL").fill("http://remote.example.com/v1");
  await page.getByRole("button", { name: /^(?:保存|Save)$/u }).click();
  await expect(page.getByRole("status")).toContainText("远程 Provider 必须使用 HTTPS");
  await page.close();
});

test("previews and applies a built-in skin to an open page without reloading it", async () => {
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error("extension service worker missing");
  const extensionId = new URL(worker.url()).host;
  const fixturePage = await context.newPage();
  await fixturePage.goto(fixtureUrl);
  const host = fixturePage.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await fixturePage.evaluate(() => {
    document.body.dataset.loadProof = crypto.randomUUID();
  });
  const loadProof = await fixturePage.locator("body").getAttribute("data-load-proof");

  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  await expect(
    optionsPage.getByRole("heading", { name: /皮肤与实时预览|Skins and live preview/u }),
  ).toBeVisible();
  await expect(optionsPage.locator(".skin-choice")).toHaveCount(6);
  await optionsPage.getByRole("button", { name: /Terminal/u }).click();
  await expect(optionsPage.locator(".skin-preview-stage")).toHaveAttribute("data-skin", "terminal");
  await optionsPage.getByLabel(/助手大小|Companion size/u).fill("72");
  await optionsPage.getByRole("button", { name: /保存外观|Save appearance/u }).click();
  await expect(optionsPage.getByRole("status")).toContainText(
    /外观设置已应用|Appearance settings applied/u,
  );
  await optionsPage.getByRole("button", { name: /应用皮肤|Apply skin/u }).click();
  await expect(optionsPage.getByRole("status")).toContainText(/皮肤已应用|Skin applied/u);

  await expect(host.locator(".fr-companion-layer")).toHaveAttribute("data-skin", "terminal");
  await expect(host.locator("button.fr-companion")).toHaveCSS("width", "72px");
  await expect(fixturePage.locator("body")).toHaveAttribute("data-load-proof", loadProof ?? "");

  const [download] = await Promise.all([
    optionsPage.waitForEvent("download"),
    optionsPage.getByRole("button", { name: /导出当前皮肤|Export current skin/u }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("terminal.floatread-skin");
  const packagePath = await download.path();
  if (!packagePath) throw new Error("exported skin package path missing");
  await optionsPage.locator('input[type="file"]').setInputFiles({
    name: "terminal.floatread-skin",
    mimeType: "application/zip",
    buffer: await readFile(packagePath),
  });
  await expect(optionsPage.getByRole("status")).toContainText(
    /已安全导入并应用 Terminal Export|Safely imported and applied Terminal Export/u,
  );
  await expect(optionsPage.locator(".skin-choice")).toHaveCount(7);
  await expect(host.locator(".fr-companion-layer")).toHaveAttribute("data-skin", "community");
  await expect(host.locator("img.fr-community-art")).toBeAttached();
  await optionsPage.close();
  await fixturePage.close();
});
