import { createServer, type Server } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";

const projectRoot = resolve(import.meta.dirname, "../..");
const extensionPath = resolve(projectRoot, "dist-e2e");
const fixturePath = resolve(projectRoot, "tests/e2e/fixtures/page.html");
const fixtureUrl = "http://127.0.0.1:4173/";
const pageTranslationLabel = /翻译当前页面|Translate this page/u;
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
  await mkdir(resolve(projectRoot, "output/playwright"), { recursive: true });
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
  await page.screenshot({
    path: resolve(projectRoot, "output/playwright/default-pet-page.png"),
    fullPage: true,
  });
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
  await expect(companion).toHaveAttribute("aria-label", pageTranslationLabel);
  const before = await companion.boundingBox();
  if (!before) throw new Error("companion bounding box missing");
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(80, 280, { steps: 6 });
  await expect(host.locator(".fr-mochi-art")).toHaveAttribute("data-interaction", "walking");
  await page.screenshot({
    path: resolve(projectRoot, "output/playwright/pet-walking.png"),
    fullPage: true,
  });
  await page.mouse.up();
  const after = await companion.boundingBox();
  if (!after) throw new Error("dragged companion bounding box missing");
  expect(after.x).toBeGreaterThanOrEqual(8);
  expect(after.y).toBeGreaterThanOrEqual(8);
  expect(after.x + after.width).toBeLessThanOrEqual(1_000 - 8);
  expect(after.y + after.height).toBeLessThanOrEqual(760 - 8);
  await page.close();
});

test("starts visible-page translation when the companion is used without a selection", async () => {
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  const companion = host.locator("button.fr-companion");
  await companion.click();
  await expect(host.getByRole("status")).toHaveText(
    /正在翻译可见页面|Translating the visible page/u,
  );
  await expect(page.locator("#source")).toHaveText("我们已重置受影响的 Codex 用户的使用限额。");
  await expect(host.locator(".fr-result-panel")).toHaveCount(0);
  await companion.click({ button: "right" });
  await host.getByRole("menuitem", { name: /清除页面译文|Clear page translations/u }).click();
  await expect(page.locator("#source")).toHaveText(
    "We reset usage limits for affected Codex users.",
  );
  await page.close();
});

test("starts page translation even when text remains selected", async () => {
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await selectFixtureSource(page);

  const companion = host.locator("button.fr-companion");
  await expect(companion).toHaveAttribute("aria-label", pageTranslationLabel);
  await companion.click();

  await expect(page.locator("#source")).toHaveText("我们已重置受影响的 Codex 用户的使用限额。");
  await expect(host.locator(".fr-action-menu")).toHaveCount(0);
  await page.close();
});

test("keeps a page translation failure visible with a recovery action", async () => {
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  const host = page.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await page.locator("#source").evaluate((element) => {
    element.textContent = "FloatRead mock page error.";
  });

  const companion = host.locator("button.fr-companion");
  await companion.click();
  const errorStatus = host.locator(".fr-page-status-error");
  await expect(errorStatus).toContainText(/API Key/u);
  await expect(errorStatus.getByRole("button")).toHaveText(/打开设置|Open settings/u);
  await expect(companion).toHaveAttribute("aria-label", pageTranslationLabel);
  await page.waitForTimeout(2_800);
  await expect(errorStatus).toBeVisible();
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
  await expect(companion).toHaveAttribute("aria-label", pageTranslationLabel);
  await companion.click({ button: "right" });
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
  await expect(companion).toHaveAttribute("aria-label", pageTranslationLabel);
  await companion.click({ button: "right" });
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
  await expect(companion).toHaveAttribute("aria-label", pageTranslationLabel);
  await companion.click({ button: "right" });
  await host.getByRole("menuitem", { name: naturalMode }).click();

  const panel = host.locator(".fr-result-panel");
  await expect(panel.locator(".fr-output-text")).toHaveText(
    "Mock 自然中文：A unique cache proof passage for FloatRead.",
  );
  await expect(panel.locator(".fr-provider-tag")).not.toContainText(/缓存|cached/u);
  await panel.getByRole("button", { name: /关闭结果面板|Close result panel/u }).click();
  await companion.click({ button: "right" });
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
  await expect(companion).toHaveAttribute("aria-label", pageTranslationLabel);
  await expect(companion).toHaveClass(/fr-state-ready/u);
  await companion.focus();
  await page.keyboard.press("ArrowDown");
  const pageTranslationItem = host.getByRole("menuitem", {
    name: /翻译当前页面|Translate this page/u,
  });
  await expect(pageTranslationItem).toBeFocused();
  await page.keyboard.press("Tab");
  const firstMode = host.getByRole("menuitem", { name: naturalMode });
  await expect(firstMode).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(host.locator(".fr-result-panel .fr-output-text")).toHaveText(
    "我们已重置受影响的 Codex 用户的使用限额。",
  );
  const animationName = await host
    .locator(".fr-artwork, .fr-community-art")
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
  await expect(localeSelect).toHaveValue("zh_CN");
  await expect(page.getByRole("heading", { name: "FloatRead 设置" })).toBeVisible();
  await localeSelect.selectOption("en");
  await expect(page.getByRole("heading", { name: "FloatRead settings" })).toBeVisible();
  await page.getByRole("button", { name: /添加一种语言|Add a language/u }).click();
  const sourceLanguages = page.locator(".language-row select");
  await expect(sourceLanguages).toHaveCount(2);
  await sourceLanguages.nth(1).selectOption("ja");
  const qualitySelect = page.getByLabel(/页面翻译档位|Page translation level/u);
  await qualitySelect.selectOption("fast");
  await expect(qualitySelect).toHaveValue("fast");
  await page.getByRole("button", { name: /保存翻译语言|Save translation languages/u }).click();
  await expect(page.getByRole("status")).toContainText(
    /翻译语言已保存|Translation languages saved/u,
  );
  await localeSelect.selectOption("auto");
  await page.getByRole("button", { name: /保存阅读设置|Save reading settings/u }).click();
  await expect(page.getByRole("status")).toContainText(/界面语言已保存|interface language saved/u);
  await page.close();
});

test("uses the simplified Popup to pause and resume the current site", async () => {
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
  await popupPage.screenshot({
    path: resolve(projectRoot, "output/playwright/simplified-popup.png"),
    fullPage: true,
  });
  const globalSwitch = popupPage.getByRole("checkbox");
  await globalSwitch.uncheck();
  await expect(host).toHaveCount(0);
  await globalSwitch.check();
  await host.waitFor({ state: "attached" });
  await popupPage.getByRole("button", { name: /暂停此网站|Pause this site/u }).click();
  await expect(host).toHaveCount(0);
  await popupPage.getByRole("button", { name: /恢复此网站|Resume this site/u }).click();
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
  await page.getByLabel(/模型名|Model/u).fill("deepseek-test-model");
  await page.getByRole("button", { name: /^(?:保存|Save)$/u }).click();
  await expect(page.getByRole("status")).toContainText(
    /已保存并设为当前 Provider|Saved and set as active/u,
  );

  await page.reload();
  await expect(page.getByLabel("API Key")).toHaveValue("");
  await expect(page.getByLabel(/模型名|Model/u)).toHaveValue("deepseek-test-model");

  await page.getByRole("radio", { name: /持久保存在本机|Persist on this device/u }).check();
  await expect(
    page.getByText(/浏览器调试权限的人仍可能读取|browser debugging access may still read/u),
  ).toBeVisible();
  await page.getByText(/高级设置|Advanced settings/u).click();
  await page.getByLabel(/服务地址|Service address/u).fill("http://remote.example.com/v1");
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
  await optionsPage.screenshot({
    path: resolve(projectRoot, "output/playwright/settings-and-pet-module.png"),
    fullPage: true,
  });
  await expect(optionsPage.locator(".skin-choice")).toHaveCount(7);
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
  await optionsPage.locator('input[accept*="application/zip"]').setInputFiles({
    name: "terminal.floatread-skin",
    mimeType: "application/zip",
    buffer: await readFile(packagePath),
  });
  await expect(optionsPage.getByRole("status")).toContainText(
    /已安全导入并应用 Terminal Export|Safely imported and applied Terminal Export/u,
  );
  await expect(optionsPage.locator(".skin-choice")).toHaveCount(8);
  await expect(host.locator(".fr-companion-layer")).toHaveAttribute("data-skin", "community");
  await expect(host.locator("img.fr-community-art")).toBeAttached();
  await optionsPage.close();
  await fixturePage.close();
});

test("turns one local PNG into an animated custom pet", async () => {
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error("extension service worker missing");
  const extensionId = new URL(worker.url()).host;
  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  const pngDataUrl = await optionsPage.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const context2d = canvas.getContext("2d");
    if (!context2d) throw new Error("canvas context missing");
    context2d.fillStyle = "#ffffff";
    context2d.fillRect(0, 0, 96, 96);
    context2d.fillStyle = "#2d3440";
    context2d.beginPath();
    context2d.arc(48, 52, 28, 0, Math.PI * 2);
    context2d.fill();
    context2d.fillStyle = "#f2a65a";
    context2d.fillRect(32, 18, 12, 24);
    context2d.fillRect(52, 18, 12, 24);
    return canvas.toDataURL("image/png");
  });
  await optionsPage.locator('input[accept*="image/png"]').setInputFiles({
    name: "test-pet.png",
    mimeType: "image/png",
    buffer: Buffer.from(pngDataUrl.split(",")[1] ?? "", "base64"),
  });
  await expect(optionsPage.locator(".pet-preview-editor img")).toBeVisible();
  await optionsPage.getByLabel(/宠物名称|Pet name/u).fill("测试宠物");
  await optionsPage.getByRole("button", { name: /使用这个宠物|Use this pet/u }).click();
  await expect(optionsPage.getByRole("status")).toContainText(
    /已创建并启用宠物“测试宠物”|Created and enabled “测试宠物”/u,
  );
  await expect(optionsPage.getByRole("button", { name: /测试宠物/u })).toBeVisible();
  await optionsPage.close();
});

test("translates visible page text, follows dynamic menus, stops, resumes, and restores", async () => {
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error("extension service worker missing");
  const fixture = await context.newPage();
  await fixture.goto(fixtureUrl);
  const host = fixture.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  const companion = host.locator("button.fr-companion");

  await fixture.evaluate(() => {
    const belowViewport = document.createElement("p");
    belowViewport.id = "below-viewport";
    belowViewport.lang = "en";
    belowViewport.textContent = "This text is outside the current viewport and must wait.";
    belowViewport.style.position = "absolute";
    belowViewport.style.top = `${window.innerHeight + 120}px`;
    document.body.append(belowViewport);
  });

  await companion.click();
  await expect(fixture.locator("#source")).toHaveText("我们已重置受影响的 Codex 用户的使用限额。");
  await expect(fixture.locator("#multiline")).toContainText("页面译文：");
  await expect(fixture.locator("#below-viewport")).toHaveText(
    "This text is outside the current viewport and must wait.",
  );
  const hostResetValue = await fixture.evaluate(async () => {
    const source = document.querySelector("#source");
    const node = source?.firstChild;
    if (!node) return null;
    node.nodeValue = "We reset usage limits for affected Codex users.";
    await new Promise((resolve) => setTimeout(resolve, 20));
    return node.nodeValue;
  });
  expect(hostResetValue).toBe("We reset usage limits for affected Codex users.");
  await fixture.evaluate(() => {
    const marker = document.createElement("span");
    marker.id = "react-update-marker";
    document.body.append(marker);
  });
  await expect(fixture.locator("#source")).toHaveText("我们已重置受影响的 Codex 用户的使用限额。");

  await fixture.evaluate(() => {
    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    const item = document.createElement("button");
    item.setAttribute("role", "menuitem");
    item.textContent = "Account settings";
    menu.append(item);
    document.body.append(menu);
  });
  await expect(fixture.getByRole("menuitem")).toHaveText("账户设置");

  await fixture.evaluate(() => {
    const french = document.createElement("p");
    french.id = "detected-french";
    french.lang = "fr";
    french.textContent = "Les utilisateurs et les modèles sont disponibles.";
    document.body.append(french);
  });
  await expect(host.getByText(/检测到法语|Detected French/u)).toBeVisible();
  await host.getByRole("button", { name: /仅本次|This time/u }).click();
  await expect(fixture.locator("#detected-french")).toContainText("页面译文：");

  await fixture.evaluate(() => {
    const storm = setInterval(() => {
      const transient = document.createElement("span");
      transient.textContent = "Transient timeline update";
      document.body.append(transient);
      transient.remove();
    }, 5);
    setTimeout(() => clearInterval(storm), 1_000);
  });
  await companion.click();
  await expect
    .poll(async () =>
      worker.evaluate(async () => {
        const stored = await chrome.storage.local.get("translationUsageSessionsV1");
        const sessions = stored.translationUsageSessionsV1 as
          Array<{ endedAt: number | null; endReason: string | null; requests: number }> | undefined;
        const latest = sessions?.[0];
        return latest ? { endReason: latest.endReason, hasRequests: latest.requests > 0 } : null;
      }),
    )
    .toEqual({ endReason: "stopped", hasRequests: true });
  await fixture.evaluate(() => {
    const paragraph = document.createElement("p");
    paragraph.id = "after-stop";
    paragraph.textContent = "This text appeared after page translation stopped.";
    document.body.append(paragraph);
  });
  await fixture.waitForTimeout(500);
  await expect(fixture.locator("#after-stop")).toHaveText(
    "This text appeared after page translation stopped.",
  );

  await companion.click();
  await expect(fixture.locator("#after-stop")).toContainText("页面译文：");
  await companion.click({ button: "right" });
  await host.getByRole("menuitem", { name: /清除页面译文|Clear page translations/u }).click();
  await expect(fixture.locator("#source")).toHaveText(
    "We reset usage limits for affected Codex users.",
  );
  await expect(fixture.locator("#multiline")).toHaveText(
    "This English release note has multiple spaces and 少量中文内容 for context.",
  );
  await expect(fixture.getByRole("menuitem")).toHaveText("Account settings");

  await fixture.close();
});

test("never auto-restarts page translation after a reload and persists Stop", async () => {
  const fixture = await context.newPage();
  await fixture.goto(fixtureUrl);
  let host = fixture.locator("floatread-root");
  await host.waitFor({ state: "attached" });

  await host.locator("button.fr-companion").click();
  await expect(fixture.locator("#source")).toHaveText("我们已重置受影响的 Codex 用户的使用限额。");

  await fixture.reload();
  host = fixture.locator("floatread-root");
  await host.waitFor({ state: "attached" });
  await fixture.waitForTimeout(900);
  await expect(fixture.locator("#source")).toHaveText(
    "We reset usage limits for affected Codex users.",
  );

  await host.locator("button.fr-companion").click();
  await expect(fixture.locator("#source")).toHaveText("我们已重置受影响的 Codex 用户的使用限额。");
  await host.locator("button.fr-companion").click();

  await fixture.reload();
  await fixture.locator("floatread-root").waitFor({ state: "attached" });
  await fixture.waitForTimeout(900);
  await expect(fixture.locator("#source")).toHaveText(
    "We reset usage limits for affected Codex users.",
  );

  await fixture.close();
});
