# 灵犀桌面版 / LingXi Desktop — 项目规则

面向内容创作者的桌面应用（Electron + React + TypeScript）。曾用名 墨栖 / InkNest（已退役）；内部工程名 `claude-desk`（package.json name / userData 目录 / win 可执行名）保持不变以保护用户数据与升级链。以下是本项目必须遵守的约定。

## 图标 / Icons（强约束）

- **禁止在程序 UI 中使用 emoji 作为图标**（如 📁 ✍️ 💬 🪟 🧩 🎉 👋 🔒 等），也不要用 emoji 充当状态符号（✓ ⚠ ★ 等）。
- 一律使用 **SVG 图标**：优先用项目已集成的 [`lucide-react`](https://lucide.dev) 图标包；找不到合适图标时再画/引入自定义 SVG。
- 原因：emoji 跨平台渲染不一致、风格与设计系统不统一、无法精确控制描边/尺寸/颜色。
- 用法：`import { FolderOpen } from 'lucide-react'`，统一 `strokeWidth`、用 `currentColor` 跟随主题色，尺寸用 `h-_ w-_`。
- 文案正文里的标点/箭头（→、·、「」）属于排版字符，不受此约束；但凡是“当图标用”的字符都要换成 SVG。

## 打包 / 防逆向（强约束，每次打包必须满足）

- **所有分发构建（mac/win/linux）必须带完整防逆向**：JS 混淆（electron.vite.config.ts，production 自动）+ Electron Fuses（electron-builder.yml：runAsNode/inspect/NODE_OPTIONS 关、asar 完整性校验/onlyLoadAppFromAsar/cookie 加密开）+ 生产禁 DevTools。
- **加固由 `scripts/verify-hardening.sh` 门禁强制**：已接入 `build:mac` 和 `build:mac:notarized`，校验混淆痕迹、6 个 fuses、代码签名，任一缺失即打包失败。新增打包通道（如新平台脚本）必须同样接入该门禁。
- **禁止**用 `DISABLE_OBFUSCATION=1` 产出分发包（该变量仅限本机调试，门禁会拒绝）。
- mac 正式分发用 `npm run build:mac:notarized`（签名+公证+装订，fuses/asar 校验只有配合签名才防篡改）。

## 其它

- 长内容写到文件、聊天里只回路径 + 摘要。
- 代码注释用英文、详细可读。
- 改动后跑 `npm run typecheck`、`npm test`、`npm run build`（electron-vite build）确认全绿。
- 关键交互改动用 CDP 真机验证（`CLAUDE_DESK_CDP=9223 npm run dev` + websocket 驱动）。
