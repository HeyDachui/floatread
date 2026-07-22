# FloatRead 0.4.1 最终交付报告

报告日期：2026-07-22

锁定工作区：`E:\AI-900\FloatRead`

发布版本：`0.4.1`

## 1. 完成概述

FloatRead 0.4.1 已形成可运行、可测试、可构建和可安装的 Chrome Manifest V3 扩展。它保留 0.4.0 的三档翻译、语言询问、后台 Token 保护、X/TED/Reddit 策略和 Mochi 动画，并修复了页面已经翻译后精读读取译文、精读连接无限转圈以及失效连接无法停止的问题。

受控 Chromium 流程、真实 DeepSeek 最小请求和生产 ZIP 均已通过。所有者随后在真实 X 和 TED 页面复测，未再发现页面翻译、自然中文、停止、连接或流畅度问题。Reddit、实际后台标签切换和宠物自然度仍需单独人工观察，不冒充已通过。

## 2. 实际实现功能

- 页面直接替换翻译；快速、智能（默认推荐）、精细三档。
- 页面译文被选中后执行精读时，还原对应真实原文；“原文”面板和 Provider 输入不再读取屏幕上的译文。
- 精读 Port 断开时立即显示可重试错误，Retry 建立新连接；Stop/关闭即使在失效连接上也立即响应。
- 本地发现其他语言，提供“仅本次、此网站以后都翻译、忽略”。用户同意前不因提醒调用 AI。
- 页面隐藏后停止扫描和新请求；允许一个已提交批次完成，返回时仅在用户未主动停止的情况下继续。
- X、TED、Reddit 增强语义策略，普通网页通用策略；TED 实时字幕、计时和高频进度区域跳过。
- 每次 Start-to-Stop 会话记录请求数、缓存命中、输入 Token、输出 Token和总 Token；不显示费用。
- Mochi 低频眨眼、拖动行走、方向转身、点击、ready/thinking/success/error 反馈；减少动画设置有效。
- 用户 PNG/JPG 本地去背景并生成轻量宠物，不上传图片，不伪造完整逐帧动作。
- 悬浮助手拖动、边缘吸附、位置保存、32–120px 大小、透明度、隐藏、站点暂停、全局暂停。
- 流式结果、取消、重试、复制、原文、缓存、Popup、设置、Onboarding、右键菜单和快捷键。
- OpenAI、OpenAI Compatible、DeepSeek、Anthropic、Gemini、Ollama 独立适配器，所有真实请求仅由 Background 发起。
- 三种 Key 保存模式、可选域名权限、严格消息校验、纯文本渲染、日志脱敏和秘密扫描。

## 3. 仓库结构

```text
FloatRead/
├── docs/                    # 架构、权限、Provider、皮肤、发布与产品记录
├── public/                  # 本地化目录和内置宠物资源
├── scripts/                 # 构建、打包、真实冒烟、清单与秘密扫描
├── src/
│   ├── background/          # Provider、权限、请求、页面翻译任务
│   ├── companion/           # Shadow DOM 悬浮界面和宠物动画
│   ├── content/             # 页面扫描、平台策略和翻译控制
│   ├── page-translation/    # 三档 Prompt、流式严格结果协议
│   ├── providers/           # 六类 Provider 适配器
│   ├── storage/             # 设置、凭据、缓存、暂停和 Token
│   ├── skins/               # 版本化无代码皮肤系统
│   └── popup/options/...    # Popup、设置和 Onboarding
├── tests/{unit,integration,e2e}/
├── dist/                    # 生产扩展，20 个文件
└── release/FloatRead-v0.4.1.zip
```

## 4. Git 提交记录

| 阶段             | Commit                                     | 内容                               |
| ---------------- | ------------------------------------------ | ---------------------------------- |
| Phase 0          | `6573a7680abb5b7573b1d58deb64f159f1ed7a3b` | 初始化仓库与架构                   |
| Phase 1          | `be39d18ee6fbdb9bd61ec496ba945097c5274829` | 独立悬浮助手                       |
| Phase 2          | `bcaa587ca3cdb7e60da4c8b5330c6062313ffa23` | Mock 流式垂直链路                  |
| Phase 3          | `26bdd909c753b4d1f13270b8f9d8f3becab9306e` | Provider、权限与凭据               |
| Phase 4          | `0cf1f92bb2ee206f581b817c21bf13e5e93dfdeb` | 版本化本地缓存                     |
| Phase 5          | `80ee9636f1025bdd6b3791ae028738b184f600fa` | 安全皮肤引擎                       |
| Phase 6          | `f93405f843fbf2b1b47f47cbc027ec900214ef66` | Popup、Onboarding、双语界面        |
| Phase 7          | `2b4c95624715b0ff2715bb5532a29002bb75f212` | 开源发布构建                       |
| V2 页面翻译      | `c69fec0c2822455e5b9e1dadd8404ceb01031898` | 渐进式页面翻译                     |
| 0.3 多语言与宠物 | `0ae860d6a21e352bceae38b9b16fdb9e796ea4a4` | 多语言、Token、自定义宠物          |
| 0.3.5 稳定性     | `c8bbc39c02b2ccc0fcffedb3b76782c84a44bddd` | 混合名称和连接恢复                 |
| 0.4 产品锁定     | `65a39f631ac50ed6a9fc00385b37ddeca22943a0` | 0.4 实施边界                       |
| 0.4 翻译能力     | `1583864678b688749be83c4f8764dcb961be3219` | 三档、语言选择、后台保护、平台策略 |
| 0.4 宠物模块     | `a32cf96f1dbe22369fe9bf1c7983e1e39857f65b` | Mochi 动画与测试                   |

## 5. 关键架构决定

- 页面只挂载一个固定定位宿主，生产使用 closed Shadow DOM，不修改站点布局或 React 状态。
- 页面文字只在用户主动开启后扫描；严格使用文字 Range 可见区域，不预读无限时间线。
- Fast 12 段/12,000 字符，Smart 8/8,000，Precise 6/6,000。快速档减少长页面请求轮数，但不承诺每个单次网络请求都必然更快。
- Content Script 不持有 Key、Provider URL、Authorization 或完整请求能力；Background 根据可信配置重建请求。
- 用户 Stop 高于自动恢复：取消在途请求、计时器、重连与后续扫描。
- 平台增强使用语义 HTML 和稳定公开属性；不依赖 X 的 `data-testid="tweetText"` 等内部选择器。
- 动态观察只处理 child-list 变化并合并扫描；跳过 TED 等站点的高频直播区域。
- 模型输出按严格 id/text JSON 验证并以纯文本写回，禁止 `innerHTML`。

## 6. Manifest 权限及用途

| 权限                                       | 用途                                                   |
| ------------------------------------------ | ------------------------------------------------------ |
| `storage`                                  | 设置、会话/本地凭据、缓存、皮肤、暂停状态和 Token 记录 |
| `contextMenus`                             | 用户选中文字后的主动右键入口                           |
| `activeTab`                                | 非 X 网站在用户点击/快捷键后获得临时使用权             |
| `scripting`                                | 在已授权当前页挂载或移除唯一宿主                       |
| `https://x.com/*`, `https://twitter.com/*` | X 上直接提供悬浮助手；无 `<all_urls>` 永久权限         |
| 可选 `https://*/*`                         | 用户选择 Provider 或主动允许其他站点时按精确来源申请   |
| 可选 localhost/127.0.0.1                   | Ollama 或用户本地代理                                  |

未申请历史、Cookie、下载、webRequest、tabs 或 unlimitedStorage。

## 7. Provider 支持矩阵

| Provider          | 普通返回 | 流式 | 取消 | 连接测试 | Base URL                    |
| ----------------- | -------- | ---- | ---- | -------- | --------------------------- |
| OpenAI            | 是       | 是   | 是   | 是       | 可配置                      |
| OpenAI Compatible | 是       | 是   | 是   | 是       | 可配置                      |
| DeepSeek          | 是       | 是   | 是   | 是       | 可配置；V4 明确关闭思考模式 |
| Anthropic Claude  | 是       | 是   | 是   | 是       | 可配置                      |
| Google Gemini     | 是       | 是   | 是   | 是       | 可配置                      |
| Ollama            | 是       | 是   | 是   | 是       | 可配置本地地址              |

## 8. 真实 API 冒烟矩阵

本轮只测试一个 Provider/模型，没有并行消耗多把 Key，没有保存译文正文。

| Provider / 模型                | 检查                       | 结果 |                    耗时 |                     Token |
| ------------------------------ | -------------------------- | ---- | ----------------------: | ------------------------: |
| DeepSeek / `deepseek-v4-flash` | Fast 六段流式严格 JSON     | 通过 | 1,909 ms；首段 1,398 ms | 405 输入 + 110 输出 = 515 |
| DeepSeek / `deepseek-v4-flash` | Precise 六段流式严格 JSON  | 通过 | 1,683 ms；首段 1,147 ms | 406 输入 + 110 输出 = 516 |
| DeepSeek / `deepseek-v4-flash` | 报告推文的自然中文流式结果 | 通过 |                1,288 ms |  365 输入 + 52 输出 = 417 |

Fast 在本次小样本低于两秒，但没有比 Precise 快；226ms 差异属于单次 Provider/网络波动。它的确定性优势是长页面每批容纳量更大。不得据此宣传“任何网络下必然更快”。

## 9. 凭据确认

- API Key 未回显、未写入源码、日志、README、缓存、`dist` 或 ZIP。
- 冒烟命令只把本地忽略文件内容短暂放入子进程环境变量，完成后删除环境变量。
- 所有者明确要求保留测试 Key，因此它仍只存在于 `.secrets/FloatRead-APIKEY.txt`；`.secrets/` 被 Git 忽略并不参与构建或扫描对象。

## 10. 实际执行的测试

| 命令                          | 真实结果                                          |
| ----------------------------- | ------------------------------------------------- |
| `pnpm format`                 | 通过                                              |
| `pnpm lint`                   | 通过，零警告                                      |
| `pnpm typecheck`              | 通过                                              |
| `pnpm test`                   | 27 文件、133 测试通过                             |
| `pnpm test:integration`       | 2 文件、2 测试通过                                |
| `pnpm test:e2e`               | 19 条真实 Chromium 扩展流程通过                   |
| `pnpm format:check`           | 通过                                              |
| `pnpm package`                | 构建、清单、两次秘密扫描、ZIP 和 MV3 加载全部通过 |
| `pnpm smoke:deepseek-page`    | Fast/Precise 各一个最小流式请求通过               |
| `pnpm smoke:deepseek-natural` | 报告推文的自然中文最小流式请求通过                |

## 11. 未执行或仍需人工的测试

- 没有对 OpenAI、Anthropic、Gemini、Ollama 使用真实凭据；其适配器由单元和 Mock 测试覆盖，不能写成真实 API 通过。
- Playwright 不能可靠把扩展 isolated world 的真实 `document.hidden` 切换出来，因此后台规则由确定性模块测试覆盖；真实 Chrome 标签切换仍需人工观察。
- 所有者的真实 X/TED 代表性复测已通过；Reddit、超长时间滚动和未来页面升级兼容仍需人工回归。
- 宠物状态和截图已检查，是否“自然好看”仍由所有者决定。

## 12. 安全与秘密扫描

- 禁止 `eval`、`new Function`、远程脚本、动态第三方 JS 和模型输出 `innerHTML`。
- 皮肤包只接受受限 JSON/PNG/WebP，并检查版本、MIME、扩展名、路径穿越、大小、重复项、危险 URL、颜色和未知字段。
- Provider HTTP 错误统一映射，429 最多自动重试一次；日志和错误不会包含完整 Authorization。
- `pnpm package` 的构建前后秘密扫描均通过；扫描覆盖 tracked/build/archive 文本文件。

## 13. 构建产物

- 解压目录：`E:\AI-900\FloatRead\dist`
- 发布 ZIP：`E:\AI-900\FloatRead\release\FloatRead-v0.4.1.zip`
- ZIP 大小：443,831 字节
- ZIP 文件数：20
- SHA-256：`f46c9872ee611ba9142e90a4f1cb4732dcccd1f46cd5b25a26a75d62a664498d`
- 生产 MV3 加载测试：3 个扩展页面已验证。

## 14. 本地安装步骤

1. 解压 `release/FloatRead-v0.4.1.zip` 到固定目录；也可直接使用仓库的 `dist`。
2. Chrome 打开 `chrome://extensions`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择解压目录或 `E:\AI-900\FloatRead\dist`。
5. 如果原来已加载旧版，点击 FloatRead 卡片的“重新加载”，再刷新正在测试的网页。
6. 打开设置，选择 DeepSeek、模型 `deepseek-v4-flash`、Key 保存方式并测试连接。

## 15. 人工验收重点

- 在 X、TED、Reddit 分别点击开始，确认只替换可见文字，滚动后继续，不插入站点正文按钮。
- 切换 Fast/Smart/Precise，对比首段和当前可见区域完成时间及质量。
- 遇到新语言时分别检查“仅本次、以后都翻译、忽略”。
- 翻译中切到其他标签页，观察最多完成一个在途批次且 Token 不继续增长；回来后自动继续。
- 点击 Stop 后等待并滚动，确认不再翻译、不重连；刷新也不擅自开始。
- 检查 Token 的输入、输出、总计与缓存命中。
- 在 32px、76px、120px 检查 Mochi 眨眼、拖动行走、转身、点击和减少动画。
- 完整清单见 `MANUAL_TESTING.md`。

## 16. 已知限制与未完成项

- TED 官方本身已有演讲字幕和文字稿翻译；FloatRead 的差异是整个学习页面翻译，不能宣传“TED 没有翻译”。
- Fast 的大批次策略提高长页面吞吐，但 Provider 与网络决定单次延迟，不能保证永远低于两秒。
- 通用网页由 activeTab 临时授权；强 CSP、跨域 iframe、canvas 文字或关闭的 Shadow DOM 无法读取。
- 自定义单张图片只能做轻量动作，不能自动生成可信的十几帧走路动画。
- 商店发布仍缺正式仓库/作者链接、批准的无凭据截图和 Reddit 人工回归。

## 17. 下一版本建议

- 用同一真实页面收集三档首段/完成时间分布，而不是用单次结果宣传速度。
- 根据人工反馈优化 TED/Reddit 动态区域与新语言提醒频率。
- 若 Mochi 自然度仍不足，再评估受控逐帧资源；保持用户上传单图的轻量边界。
- 评估术语固定译法与整篇文章的显式一次性翻译，但不得恢复无限时间线扫描。

## 18. 最终验收结论

- 形式存在：通过。
- 功能可运行：受控 Chromium、真实 DeepSeek、生产构建与 ZIP 加载通过。
- 质量达到要求：自动化、安全、包体以及所有者的真实 X/TED 代表性复测通过；Reddit、超长时间平台行为与主观宠物自然度仍为人工未知项。
- 可投入状态：可以交给所有者安装测试；在完成真实站点清单和正式品牌素材前，不宣称 Chrome 商店发布就绪。
