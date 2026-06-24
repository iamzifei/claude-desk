# 墨栖 / InkNest — 项目规则

面向内容创作者的桌面应用（Electron + React + TypeScript）。以下是本项目必须遵守的约定。

## 图标 / Icons（强约束）

- **禁止在程序 UI 中使用 emoji 作为图标**（如 📁 ✍️ 💬 🪟 🧩 🎉 👋 🔒 等），也不要用 emoji 充当状态符号（✓ ⚠ ★ 等）。
- 一律使用 **SVG 图标**：优先用项目已集成的 [`lucide-react`](https://lucide.dev) 图标包；找不到合适图标时再画/引入自定义 SVG。
- 原因：emoji 跨平台渲染不一致、风格与设计系统不统一、无法精确控制描边/尺寸/颜色。
- 用法：`import { FolderOpen } from 'lucide-react'`，统一 `strokeWidth`、用 `currentColor` 跟随主题色，尺寸用 `h-_ w-_`。
- 文案正文里的标点/箭头（→、·、「」）属于排版字符，不受此约束；但凡是“当图标用”的字符都要换成 SVG。

## 其它

- 长内容写到文件、聊天里只回路径 + 摘要。
- 代码注释用英文、详细可读。
- 改动后跑 `npm run typecheck`、`npm test`、`npm run build`（electron-vite build）确认全绿。
- 关键交互改动用 CDP 真机验证（`CLAUDE_DESK_CDP=9223 npm run dev` + websocket 驱动）。
