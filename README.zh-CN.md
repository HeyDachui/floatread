# FloatRead（浮读）

FloatRead 是一个开源、无开发者服务器、用户自带 API Key 的 Chromium 页面翻译助手。用户点击宠物开始后，它会随滚动翻译可见内容：正文优先自然翻译，菜单与控件使用持久本地翻译记忆；选区精读保留为辅助功能。

> 当前版本：`0.3.3`。页面翻译默认只处理英语；用户可在设置中添加其他源语言并选择统一目标语言。源码中的发布者链接是集中管理的临时默认值；公开发布前应修改 `src/config/branding.ts`。

[English](README.md) · [隐私说明](PRIVACY.md) · [安全政策](SECURITY.md) · [人工测试](MANUAL_TESTING.md)

## 功能

- 自然中文：忠实、自然，不添加原文没有的信息。
- 看懂重点：说明原文主旨、关注价值、未说明事项，并明确标记推断。
- 解释术语：用普通中文解释关键术语在当前文本中的含义。
- 一键开启可见页面翻译，滚动时渐进处理新内容；再次点击立即停止。
- 一到五种源语言、一个目标语言；界面本身只提供简体中文和英文。
- 每次从开始到停止的请求数、缓存命中和输入/输出/总 Token 本地记录。
- 推文/正文使用精翻，导航、菜单和按钮使用简洁界面翻译。
- 有容量上限的持久本地翻译记忆，重复菜单不再调用模型。
- 可拖动、左右吸附、坐标修正、大小与透明度调整的悬浮助手。
- 流式结果、取消、重试、复制、查看原文和有容量/期限限制的本地缓存。
- 简化 Popup、当前网站暂停、全局暂停、右键菜单、快捷键和首次引导。
- 中英文界面、键盘操作、深浅色兼容和减少动画支持。
- OpenAI、OpenAI Compatible、DeepSeek、Anthropic Claude、Google Gemini 和 Ollama。
- 默认原创宠物 Mochi、六套内置球/角色皮肤，以及把一张 PNG/JPG 本地变成宠物的工具。

FloatRead 没有开发者后端、账号、支付、会员、广告、埋点、遥测或使用统计。Provider 请求由扩展 Background Service Worker 直接发往用户配置的服务地址。

## 页面翻译如何工作

用户明确启动后，FloatRead 只扫描可见和接近视口、且属于用户所选源语言的文本。语言判断在本地完成；它使用语义化 HTML 角色，不依赖 X 私有的 `data-testid`。普通批次最多处理 6 个片段/6,000 字符，并在滚动时处理新出现内容，不预读无限时间线。

译文会替换对应可见文本节点，因此文字换行可能变化。受限观察器只监测新增/删除节点，不与 React 持续争夺字符数据。停止会从 Background 取消当前批次、关闭当前 Origin 的重启偏好并保留已有译文；清除还会恢复仍然存在的原文节点。页面刷新后绝不会自动发起翻译。

只有用户明确为当前网站开启页面翻译后，才会发送可见页面文本；选区精读仍需单独主动操作。详见 [V2 产品边界](docs/V2_PRODUCT_BOUNDARY.md)。

## 截图说明

仓库不伪造产品截图。维护者应从真实的未解压生产构建中截图，确保凭据不可见，审核后再放入 `docs/assets/` 用于商店发布。

## 安装发布包

1. 获取 `FloatRead-v0.3.3.zip`，并用相邻 `.sha256` 文件校验摘要。
2. 将 ZIP 解压到固定的本地目录。
3. 打开 `chrome://extensions`，启用“开发者模式”，点击“加载已解压的扩展程序”，选择包含 `manifest.json` 的解压目录。
4. 打开设置，添加 Provider；在提示后授予精确的接口域名权限，并测试连接。

Chrome 的“加载已解压的扩展程序”需要选择解压目录，而不是 ZIP 文件。

## 开发与构建

需要 Node.js 20.19+ 和 pnpm 10+；仓库记录的 pnpm 版本为 11.9.0。

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm package
```

生产目录为 `dist/`；ZIP、文件清单和 SHA-256 位于 `release/`。E2E 会从隔离的 `dist-e2e/` 启动真实 Chromium 扩展。

## Provider 与 API Key

进入“设置 → AI 服务”，选择服务和模型，填写 Key 并选择保存方式，然后保存或授权测试连接。DeepSeek 排在最前；服务地址和连接等待时间只在“高级设置”中显示。自定义接口优先选择 OpenAI Compatible。

三种 Key 模式：

- 仅本次会话（推荐）：保存到 `chrome.storage.session`。
- 持久保存在本机：保存到 `chrome.storage.local`，界面会显示风险提示。
- 每次输入：只进入 Service Worker 内存；MV3 Worker 重启后可能需要重新输入。

FloatRead 不会收到你的 Key，但浏览器客户端存储不是硬件保险库。建议使用独立、低额度、可随时吊销的 Key；安全要求更高时优先使用 Ollama 或自己控制的本地代理。Key 不进入 sync 存储、Content Script 消息、缓存、皮肤包或设置导出。

协议、默认地址和 Ollama 配置见 [Provider 配置文档](docs/PROVIDERS.md)。

## 权限

| 权限               | 用途                                                     |
| ------------------ | -------------------------------------------------------- |
| `storage`          | 保存设置、网站翻译偏好、缓存、皮肤与用户选择的凭据模式。 |
| `contextMenus`     | 用户对选中文字主动使用三种阅读模式。                     |
| `activeTab`        | 用户点击工具栏或快捷键后，临时在当前非 X 页面启用。      |
| `scripting`        | 在上述用户手势后挂载或移除唯一宿主节点。                 |
| X/Twitter 明确域名 | 用户开启后渐进翻译可见 X 文本，不依赖私有推文选择器。    |
| 可选 HTTPS 域名    | 用户配置 Provider 时才申请对应精确 Origin。              |
| 可选 localhost     | 用户自己的 Ollama 或本地代理。                           |

FloatRead 不请求历史记录、Cookie、下载记录、广泛标签页访问、webRequest 或永久 `<all_urls>`。完整说明见 [权限说明](docs/PERMISSIONS.md)。

## 隐私与安全

为当前网站开启页面翻译后，可见页面文字会直接发送给用户选择的 Provider；选中文字只在精读操作后发送，并受对应 Provider 条款约束。FloatRead 没有接收数据的开发者服务器，不收集统计。模型输出按文本渲染；外部 JSON 使用 Schema 校验；皮肤包不能包含可执行内容；生产构建会检查秘密和远程代码。

请阅读 [PRIVACY.md](PRIVACY.md)、[SECURITY.md](SECURITY.md) 和 [威胁模型](docs/THREAT_MODEL.md)。安全漏洞不要通过公开 Issue 披露。

## 皮肤制作与导入

最简单的方式是在设置中拖入一张 PNG/JPG：扩展在本地去除与边缘相连的浅色背景、裁剪、生成透明 WebP，并套用内置动作。社区包仍是本地 `.floatread-skin` ZIP，只允许严格 JSON 与 PNG/WebP；JavaScript、HTML、SVG、CSS、字体、远程 URL 和可执行表达式都会被拒绝。制作方法与容量限制见 [皮肤文档](docs/SKINS.md)。

## 参与贡献

欢迎 Issue 和 Pull Request。开始前请阅读 [贡献指南](CONTRIBUTING.md) 与 [行为准则](CODE_OF_CONDUCT.md)。任何改动都必须维持页面隔离、凭据边界和用户主动触发原则。

## 已知限制

- V1 只验证 Chromium MV3；尚未验证 Firefox 和 Safari。
- 快捷键可能与其他扩展冲突，可到 `chrome://extensions/shortcuts` 调整。
- 会话或每次输入模式可能在浏览器/Service Worker 重启后要求重新输入 Key。
- 流式体验取决于 Provider 或代理自身能力。
- 正式发布者身份与仓库链接仍待公开所有者更新。
- Mock 测试不等于真实 API 测试；真实冒烟结果会单独记录。

## 路线图

- 确定正式发布者身份和商店素材。
- 验证更多 Chromium 浏览器。
- 增加更多不可执行的社区皮肤。
- 在不破坏隐私边界的前提下提供更细的 Provider 诊断。

## 作者与开源项目入口

当前默认入口为临时的 [FloatRead GitHub 组织](https://github.com/floatread)、[项目仓库](https://github.com/floatread/floatread) 与其他开源项目。确定正式公开地址后，应统一修改品牌配置。

## 许可证

[MIT](LICENSE) © 2026 FloatRead Contributors。
