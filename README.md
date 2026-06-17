# 墨栖 InkNest

**内容创作者的素材库 × AI 创作台。** 面向抖音 / 小红书 / 公众号 / YouMind 等平台的图文与
多媒体创作者:沉淀自己的素材与上下文,用 AI 高效产出多平台内容。本地优先(BYO-key,无后端),
Electron + electron-vite + React,直连官方 Anthropic SDK 与兼容供应商。

> 起源:对 牛马AI (newmax) 架构的 clean-room 复刻,已演进为面向内容创作者的差异化产品
> (新品牌 / 冷靛紫视觉 / 素材库 / 创作预设)。设计与定位见 `docs/DESIGN.md`,
> 功能验证记录见 `docs/ALIGNMENT.md`。

## What works today

- Multi-conversation chat with streaming responses (token-by-token)
- Adaptive thinking, rendered in a collapsible "Thinking…" block
- Local persistence — conversations + messages in SQLite (`better-sqlite3`, WAL mode)
- Multi-provider: Anthropic (official), DeepSeek, 智谱 GLM, Moonshot/Kimi — all Anthropic-compatible
- API key stored **encrypted** via the OS keychain (Electron `safeStorage`)
- Cancel an in-flight response
- Auto-titled conversations

## Architecture (three-process, electron-vite)

```
src/
  main/                 Node main process
    index.ts            app lifecycle, window, wires DB + IPC
    db/
      index.ts          better-sqlite3 + WAL + migration runner
      settings.ts       settings repo; API key encrypted via safeStorage
      conversations.ts  conversation + message repos
    agent/
      providers.ts      Anthropic-compatible provider registry
      run.ts            streaming engine via @anthropic-ai/sdk  <- swap point for full agent SDK
    ipc/
      index.ts          all IPC handlers (agent / conversations / settings / app)
  preload/
    index.ts            contextBridge -> window.api (namespaced)
    index.d.ts          shared domain types + window.api typing
  renderer/             React UI
    src/
      store.ts          zustand store, wires the agent:chunk stream
      App.tsx
      components/        Sidebar, ChatView, MessageBubble, Composer, SettingsModal
      assets/main.css   dark theme
```

Data lives in Electron's `userData` dir as `claude-desk.db`.

## Run it

```bash
npm install      # already done; rebuilds better-sqlite3 for Electron via postinstall
npm run dev      # launch in development (HMR)
npm run build    # typecheck + production build
npm run build:mac   # package a .app/.dmg (electron-builder)
```

First launch: click **Settings** (bottom-left), choose a provider, paste your API key, Save.

## The one swap point: turning this into a real coding agent

`src/main/agent/run.ts` currently uses `@anthropic-ai/sdk`'s streaming `messages.stream()` —
pure HTTPS, no subprocess, reliable to package. To get file edits / bash / tools (true
"Claude Code" behavior), replace the body of `runChat()` with `@anthropic-ai/claude-agent-sdk`'s
`query()` and forward its richer event stream. The IPC/preload/renderer contract (text +
thinking + done/error chunks) is deliberately generic so that change stays local to that one file.
`@anthropic-ai/claude-agent-sdk` is already installed.

## Stack

electron-vite 5 · Electron 39 · React 19 · TypeScript 5.9 · zustand 5 · better-sqlite3 12 ·
@anthropic-ai/sdk · @anthropic-ai/claude-agent-sdk · react-markdown
