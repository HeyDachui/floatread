# Mochi 内置宠物资产记录

状态：FloatRead 0.3 内置发布资产。

## 最终资产

- 仓库路径：`public/pets/mochi/mochi.webp`
- 格式：WebP，RGBA 透明背景
- 尺寸：418 × 512
- 文件大小：148,182 bytes
- 用途：FloatRead Shadow DOM 内的默认悬浮宠物

## 产生方式

2026-07-21 使用 Codex 内置图片生成工具，以
`E:\AI-Downloader-test\头像\宠物形象` 中由用户指定的九张猫角色图片作为仅供风格和状态理解的参考，生成一个新的 FloatRead 角色。未把参考文件复制进发布包。

最终生成描述记录：

> Create one original, friendly floating reading-companion cat named Mochi. Use a cream and charcoal coat, warm amber eyes, rounded readable silhouette, one raised paw and a calm curious expression. Keep it distinct from the reference character and from existing commercial characters. Center the full character, no text, no logo, no frame, no orange disc, no props. Clean polished 2D illustration suitable for a 76 px browser companion. Render on a flat chroma-green background (#00ff00) for local background removal.

生成模式：全新生成，并使用本地参考图片帮助理解希望的“可爱桌宠、清晰轮廓、不同状态可读”方向。生成源随后通过本地色键去除背景、自动裁边，并转换成无损透明 WebP；最终发布包只包含上述 WebP。

## 权利与发布

Mochi 是为 FloatRead 生成并命名的新角色，不使用“宝可梦”“皮卡丘”等名称、标识或角色造型。该最终资产随 FloatRead 仓库按项目 `LICENSE` 发布。用户提供的参考文件保持在原目录，既不移动也不纳入仓库；其来源和权利状态不由本项目另行主张。
