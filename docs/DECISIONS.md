# Claude Desk — 构建决策日志与分析报告

> 这是 James 睡觉期间自主构建本项目时的关键决策记录。每条记录"在哪个岔路口、
> 我选了什么、为什么"。供你醒来后快速 review，不认可的地方可以让我改。
> 构建时间：2026-06-16 凌晨（autonomous session）。

---

## 总览：做了什么

从零搭出一个**可运行的 Claude Code 桌面端 MVP**（形态 A：纯本地 BYO-key），基于对
牛马AI(newmax) 的逆向架构。状态：

- ✅ `npm run typecheck` 通过（main + web 双 tsconfig，0 error）
- ✅ `npm run build` 通过（main / preload / renderer 三段全部产出）
- ✅ Electron ABI 冒烟测试通过：better-sqlite3 在 Electron 39 下正常加载 + WAL + 读写；safeStorage 加密可用
- ⏳ 未做 GUI 点击实测（需要窗口服务器 + 会打扰你睡觉；已用无窗口冒烟测试覆盖最高风险的原生模块）

代码量：main 进程 6 个模块 + preload + renderer(store + 5 组件 + css)。

---

## 关键决策

### D1. 项目形态：选「形态 A · 纯本地 BYO-key」
- **岔路口**：A(纯本地，用户填自己 key) / B(带账号+订阅+API中转) / C(企业版)。
- **决定**：A。
- **为什么**：你说"尽可能做"，A 是唯一能在一晚做到**端到端可运行**的形态——不依赖任何后端、不需要 newmax.cc 那套账号/计费服务端。B/C 的后端是另一个工程，且需要你定业务决策（定价、是否当 API 转售商）。A 跑通后升级到 B 只是新增一层薄后端，架构不用推翻。

### D2. 脚手架：electron-vite 官方模板 react-ts
- **岔路口**：手写 Electron 工程 vs 用官方脚手架。
- **决定**：用 `npm create @quick-start/electron` 的 react-ts 模板（和牛马AI 同款 electron-vite 三段式）。
- **为什么**：手写 vite/electron/tsconfig 配置容易踩隐蔽坑；官方脚手架给一套验证过的基线（externalize、tsconfig.node/web 分离、electron-builder 配置）。
- **踩坑**：脚手架的交互式 prompt 从 `/dev/tty` 读输入，管道喂答案无效。最终用 `expect` 脚本驱动通过。记录在案，下次直接用 expect。

### D3. 接 Claude 的路线：用 `@anthropic-ai/sdk` 流式，而非 claude-agent-sdk 子进程
- **岔路口**：路线①(node-pty 跑 claude CLI 套壳) / 路线②直接用 SDK。②里又分：`@anthropic-ai/sdk`(纯 HTTP 流式) vs `@anthropic-ai/claude-agent-sdk`(会 spawn CLI 子进程，带工具/文件编辑)。
- **决定**：v0 用 `@anthropic-ai/sdk` 的 `messages.stream()`。
- **为什么**：claude-agent-sdk 底层会 spawn 一个 node CLI 子进程，在 Electron 打包后路径解析容易出问题，一晚上 debug 打包不值得。纯 HTTP 流式零子进程、最可靠、当晚必出可运行版本。**代价**：v0 没有文件编辑/bash/工具能力（那才是"Claude Code"的精髓）。
- **缓解**：把 `runChat()` 设计成唯一 swap point——IPC/preload/renderer 的数据契约(text/thinking/done/error)做成通用的，将来换成 claude-agent-sdk 的 `query()` 只改 `src/main/agent/run.ts` 这一个文件。`@anthropic-ai/claude-agent-sdk` 已装好待用。
- **👉 需要你拍板**：醒来后如果你要的是「真·编程 agent」（能改文件跑命令），告诉我，我把 run.ts 换成 claude-agent-sdk 路线（半天工作量）。

### D4. 模型 ID：默认 `claude-opus-4-8`
- **决定**：默认 provider=anthropic，model=`claude-opus-4-8`。
- **为什么**：查了 claude-api 权威 skill 文档确认这是当前最强 Opus-tier 的准确 model ID（不是凭记忆猜的，避免 404）。开启 adaptive thinking + `display: summarized` 以便 UI 展示思考过程。其它 provider 的 model ID 用各家默认值，用户可在设置里改。

### D5. 本地存储：better-sqlite3 + WAL + migration runner
- **决定**：照搬牛马AI 的存储选型（newmax.db → 我们的 claude-desk.db），WAL 模式，`user_version` pragma 驱动的极简迁移系统。
- **为什么**：成熟选型，同步 API 在 Electron 主进程里好用。**最大风险是原生模块 ABI**——已用 Electron 冒烟测试验证通过（见上）。

### D6. API key 安全：safeStorage 加密，绝不明文落库
- **决定**：API key 用 Electron `safeStorage`(系统钥匙串) 加密后存 settings 表，前缀 `enc:` 标记；返回给 renderer 的只有 `hasApiKey` 布尔，明文 key 永不过 IPC 边界回前端。
- **为什么**：BYO-key 产品里 key 是用户最敏感的东西，明文存 SQLite 不可接受。冒烟测试确认 safeStorage 在本机可用。

### D7. 多供应商：内置 4 家 Anthropic 兼容 provider
- **决定**：providers.ts 里放 Anthropic / DeepSeek / 智谱GLM / Moonshot，都走各自的 `/anthropic` 兼容端点，同一个 SDK client 只换 baseURL。
- **为什么**：这是牛马AI 的"集成广度"护城河里最容易复刻的一块，几乎零成本，且对你（手上有多家 key）实用。failover 自动切换没做（v0 砍掉）。

### D8. MVP 范围：412 个 IPC 通道砍到 ~12 个
- **决定**：只实现 agent:query/cancel/chunk + conversations:list/create/delete/rename/messages + settings:get/set/getProviders + app:getDefaultWorkspace/openFolder/openExternal。
- **砍掉**：浏览器自动化、IM 机器人、语音、技能市场、定时任务、团队授权、MCP 等全部。
- **为什么**：那些是"集成广度"，核心对话闭环跑通后按需加。先证明骨架能跑。

### D9. UI：自己写深色主题，不引 UI 库
- **决定**：手写 CSS 深色主题(暖琥珀单色强调 + 中性灰阶 + 4px 间距节奏)，不引 Radix/Tailwind。
- **为什么**：MVP 不值得配 Tailwind/组件库的构建链。布局简单(sidebar + chat)，手写 CSS 更快更可控。装了 react-markdown 渲染 AI 输出（代码块/列表/链接）。
- **注**：装了 impeccable 设计 hook，每个组件写完都扫过，无反模式。

---

## 验证状态（诚实记录）

| 项 | 状态 | 证据 |
|---|---|---|
| TypeScript 类型检查 | ✅ 通过 | `npm run typecheck` 0 error（node+web） |
| 生产构建 | ✅ 通过 | `npm run build` 三段全部产出 |
| better-sqlite3 原生模块 | ✅ 通过 | Electron 39 下冒烟：WAL+建表+读写 OK |
| safeStorage 加密 | ✅ 可用 | 冒烟：isEncryptionAvailable=true |
| Electron 应用启动 | ✅ 通过 | `npm run dev` 实跑：main 进程过了 initDb+registerIpc，窗口创建成功，日志 0 error，进程存活 |
| GUI 实际点击/真实对话 | ⏳ 未测 | 需真实 API key + 手动点击；逻辑已就绪 |

**未测部分的风险评估**：构建、类型、原生模块、Electron 应用启动都已验证通过——
应用能真实启动、主进程初始化数据库和 IPC 全部正常、窗口创建成功、日志零错误。
唯一没覆盖的是「填真实 key 发一句话走完整流式闭环」这一步（需要你的 API key +
手动点击）。剩余风险只在纯前端逻辑的小细节（流式渲染时序、optimistic message
替换），出大问题概率很低。你醒来 `npm run dev` 填上 key 点一下即可确认。

---

## 醒来后的下一步（建议优先级）

1. **`npm run dev` 实测**：填一个 Anthropic key，发一句话，确认流式+落库+多会话切换都正常。这是唯一没自动验证的环节。
2. **拍板 D3**：要不要把引擎换成 claude-agent-sdk，做成真能改文件/跑命令的编程 agent。要的话我半天能换。
3. 按需从被砍的 412 通道里挑要加的（我建议下一个加 **MCP 接入** 或 **工作目录/项目管理**）。
4. 升级到形态 B（账号+订阅）时，参考 `~/Downloads/牛马AI-electron-extract/复刻方案.md` 第 7 节。

---

## 相关文档
- 逆向架构分析：`~/Downloads/牛马AI-electron-extract/ARCHITECTURE.md`
- 完整复刻方案(分阶段)：`~/Downloads/牛马AI-electron-extract/复刻方案.md`
- 本项目说明：`./README.md`
