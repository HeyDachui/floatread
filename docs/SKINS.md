# FloatRead 皮肤制作与导入

FloatRead 皮肤只改变扩展自己的悬浮助手、结果面板、Popup 和设置页设计令牌。它不能修改网页、X 时间线、字体或布局，也不能执行任何代码。

## 内置皮肤

V1 提供六套原创内置皮肤：Native、Lens、Glass Orb、Pixel Bot、Ink 和 Terminal。每套皮肤覆盖 `idle`、`ready`、`thinking`、`success`、`error` 五种状态，并从 FloatRead 内置动画预设中选择动效。

## 包格式

皮肤包扩展名为 `.floatread-skin`，文件内容是 ZIP。根目录必须有 `skin.json`，资源只允许 PNG 或 WebP：

```text
my-skin.floatread-skin
├── skin.json
├── preview.png
└── assets/
    ├── idle.png
    ├── ready.png
    ├── thinking.webp
    ├── success.png
    └── error.png
```

所有资源必须由 `skin.json` 引用，不允许携带额外文件。状态资源缺省时回退到 `idle`。

## `skin.json` 示例

```json
{
  "schemaVersion": 1,
  "id": "example-soft-orb",
  "name": "Soft Orb",
  "version": "1.0.0",
  "author": "Example Author",
  "description": "A restrained local-only skin.",
  "license": "MIT",
  "assets": {
    "idle": "assets/idle.png",
    "ready": "assets/ready.png",
    "thinking": "assets/thinking.webp",
    "success": "assets/success.png",
    "error": "assets/error.png",
    "preview": "preview.png"
  },
  "motions": {
    "idle": "breathe",
    "ready": "pulse",
    "thinking": "spin",
    "success": "bounce",
    "error": "shake"
  },
  "panel": {
    "accent": "#77D8FF",
    "background": "#10151C",
    "backgroundElevated": "#18212C",
    "text": "#F3FBFF",
    "textMuted": "#92AABB",
    "border": "#294052",
    "success": "#72E6A5",
    "warning": "#FFD166",
    "error": "#FF747D",
    "radius": 14,
    "shadowStrength": 0.28
  }
}
```

允许的动画值为 `none`、`breathe`、`float`、`pulse`、`bounce`、`shake`、`spin`。系统开启 `prefers-reduced-motion` 时动画会被禁用。颜色必须是 `#RRGGBB` 或 `#RRGGBBAA`，圆角范围为 8–24，阴影强度范围为 0–0.6。

## 安全与容量限制

- 整包最大 5 MB，单张图片最大 1.5 MB，总解压大小最大 5 MB。
- 最多 12 个 ZIP 条目；图片宽高必须处于 32–512 像素。
- 校验扩展名、文件签名和浏览器实际解码结果，不只信任文件名。
- 拒绝路径穿越、重复文件、加密 ZIP、ZIP64、异常压缩率和未引用文件。
- 拒绝 JavaScript、HTML、SVG、CSS、字体、远程 URL、`data:text/html` 和未知字段。
- `skin.json` 使用严格版本化 Schema；当前支持 V1，并可迁移受支持的 V0 面板字段。
- 社区皮肤总本地容量上限为 25 MB。元数据与图片二进制分开保存。

导入失败时设置页会显示具体原因和相关文件名。导出包只包含皮肤清单和图片，绝不包含 Provider 配置、API Key、缓存结果或网页内容。

## 本地验证

```bash
pnpm test -- tests/unit/skin-package.test.ts
pnpm test -- tests/unit/skin-storage.test.ts
pnpm test:e2e
```

发布社区皮肤前，请先在浅色、深色和减少动画环境下人工检查五个状态，并确认图片版权与许可证允许公开分发。
