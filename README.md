# Claude Desk

A local-first **Claude Code–style desktop client**, built as a clean-room reimplementation
of the architecture behind 牛马AI (newmax). Electron + electron-vite + React, talking to the
official Anthropic SDK (and Anthropic-compatible providers) directly from your machine with
your own API key. **No backend required.**

> Form A (BYO-key, local-only) MVP. See `复刻方案.md` in `~/Downloads/牛马AI-electron-extract/`
> for the full staged plan and how to grow this into a paid product (accounts, billing, API proxy).

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
