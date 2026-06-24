# Claude Desk — 构建决策日志与分析报告

> 2026-06-24 续：**收藏支持技能 + 拖拽可靠性修复**。
> - 反馈：技能拖不进收藏夹、窗格也拖不进收藏夹。
> - 根因①：收藏放置区只认 `hasPaneDrop`（窗格/模块载荷），不接受技能载荷；且收藏存的是 `SplitTarget`，没有「技能」类型。→ 新增 `Favorite = SplitTarget | {kind:'skill',name,slug}`；放置区改 `hasPaneDrop || hasSkillDrag`，落点按载荷分流（技能→skill 收藏，其它→pane 收藏）。
> - 根因②（窗格真机拖拽失败）：原生 HTML5 DnD 未显式设 `dropEffect`，drop 可能被判为 none。→ 收藏/窗格 DropArea/输入框三处 `onDragOver` 加 `e.dataTransfer.dropEffect='copy'`。
> - 技能收藏用途：高频技能收藏后从收藏夹**直接拖进对话**插入 `/slug`（免去 `/` 海量搜索）；技能行也加 ★ 一键收藏。
> - 验证：typecheck + 165 tests + build；CDP——★ 收藏 `ads-review` 显示 `/ads-review`、拖入输入框得 `/ads-review `；窗格拖收藏仍 pin。**真机拖拽**(dropEffect)合成事件测不出，需重启 app 实测。
>
> 2026-06-24 再修：**窗格拖拽根因 = `<button draggable>`**。技能行(`<div draggable>`)能拖，窗格手柄是 `<button draggable>` — Chromium 从 button 启动原生拖拽不可靠，导致窗格既不能拖去收藏、也不能拖动换位。→ 手柄改 `<div role=button draggable>`（对齐技能行写法）并放大抓取区。CDP 真机鼠标(Input.dispatchMouseEvent)验证：改 div 后 grip 的 `dragstart` 能触发(button 不行)；drop 终点因 CDP 不驱动原生拖拽 loop 无法端到端测，但落点 handler 已由技能拖拽证明可用。
>
> 2026-06-24 三修（窗格仍拖不动→换技术栈）：原生 HTML5 DnD 在工作区对窗格始终不可靠（3 次反馈）。**改用 pointer 事件自实现窗格拖拽**：手柄 `onPointerDown` → `window` 上挂 pointermove/up → 每次 move 用 `document.elementFromPoint` 命中 `[data-pane-index]`(算插入槽，按横向中点定 before/after)或 `[data-favzone]`(收藏)。store 新增 `paneDragFrom/paneDropAt/beginPaneReorder/setPaneDropAt/endPaneReorder/reorderPanes(insert 语义)`。**满足「拖到中间插入式重排」**(非 swap)，并显示插入指示条。收藏夹加 `data-favzone` + pointer 高亮。CDP 真机鼠标全链路验证通过：`技能|素材库`→拖 pane0 到 pane1 右半→`素材库|技能`；拖手柄到收藏区→pin。
>
> 2026-06-24 附带修：**分屏窗格里视图不滚动**（如技能：超长 desc 把短窗格撑满，列表被挤成 0 高）。→ 共享 `Header` 的 desc 加 `line-clamp-2` + 整块 `shrink-0`；技能 desc 缩短。CDP 验证：技能列表在窗格内 clientH=441、可滚动、721 行可达。


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

## 2026-06-23 — 知识库(Vault) / 项目提级 / 关系图接入 (P1)

来源：内容创作者访谈反馈。完整计划见 `docs/PLAN-vault-finder-panes-2026-06-23.md`。

| 岔路口 | 选择 | 理由 |
|---|---|---|
| 知识库真相源 | **磁盘 `.md` 为本体**，SQLite 仅为可重建的派生索引(`vault_files`/`vault_links`, migration 0014) | Obsidian 真兼容：用户能同时用 Obsidian 打开同一文件夹；app 用 chokidar 监听外部改动并重索引 |
| 项目 ⇄ 知识库基数 | **1 项目 = 1 知识库**，直接复用 `project.dir_path` | 心智最干净；多 vault 的跨库检索复杂度留待后续「链接外部文件夹」补 |
| chokidar 引入方式 | `await import('chokidar')` 动态导入 | chokidar v5 是 ESM-only，主进程打包为 CJS，沿用 `coding.ts` 加载 agent-sdk 的同款模式 |
| 编辑冲突策略 | 打开记 mtime；写盘前比对，外部已改且本地有未保存改动 → 顶部冲突条「保留我的 / 重新载入」 | v1 不做三方合并；最后写入者明确由用户决定 |
| workspace/project 心智 | v1 以「项目=知识库」为主心智，UI 不再暴露 workspace 级文件夹绑定，避免双重「绑定文件夹」入口 | 收敛 `Workspace.root_path` 与 `Project.dir_path` 的冗余困惑；`root_path` 字段保留不删 |
| 关系图接入 | `buildGraph` 本就 kind-agnostic，仅在 `graph.ts` 把 vault 笔记/链接喂入(kind `vault`, id=`${projectId}::${rel}`)；点击节点在分屏打开该笔记 | 零改动复用既有纯函数与力导向布局，人物关系直接来自 `.md` 的 `[[]]` |

**P1 验证**：typecheck(node+web) 通过；vitest 143 passed（新增 `tests/vault.test.ts` 11 例 + graph vault 1 例）；`electron-vite build` 成功；chokidar 确认运行时动态加载未被打包。
**未自动覆盖**：GUI 实跑（绑定真实 Obsidian 文件夹、编辑落盘、外部改动回流的肉眼确认）需 `npm run dev` 手测。

## 2026-06-24 — 创作者反馈批次（项目重命名 / GFM / 富预览 / 资产项目作用域）

| 岔路口 | 选择 | 理由 |
|---|---|---|
| 项目/文件无法重命名 | 改为**内联重命名**（替换 `window.prompt`） | Electron 不支持 `window.prompt`（返回 null），这是旧项目重命名一直失效的根因；`window.confirm` 可用故删除不受影响 |
| Markdown 不渲染表格 | 接入 **`remark-gfm`** + `.markdown` 表格/任务列表/引用 CSS | GitHub Flavored Markdown；编辑器预览与对话消息同时支持 |
| 非 md 文件预览 | `FilePreview` 按类型路由：图片/PDF 内嵌、文本直显、其余「系统应用打开/访达显示」 | 类 Obsidian/macOS Quick Look；office 文档走系统默认应用即 macOS 预览 |
| 资产作用域 | **顶部全局项目切换器** + 可空 `project_id`（migration 0015，保留 全部/未归类） | 项目成为主作用域，符合「项目=一等公民」；非破坏、可逆 |
| 作用域实现方式 | 主进程 `db/scope.ts` 持有当前作用域，list/search/tags/graph 自动按其过滤，create 按其盖章 | 避免给每个 IPC 签名穿透 projectId；视图只需把 `projectScope` 加进 effect 依赖即重取 |

**验证**：typecheck + vitest 151 passed（新增 scope/mime/vault-mime 测试）+ build + 实跑 `npm run dev`（migration 0015 上线、零错误）。conversations 仍按项目分组展示、暂未随作用域过滤（侧边栏 IA 待重整时一并处理）。

## 2026-06-24 — 侧边栏重整为「项目为中心」+ 项目管理（删除/排序/归档）

| 岔路口 | 选择 | 理由 |
|---|---|---|
| 侧边栏 IA | **项目为中心**：项目切换器做主角 → 该项目作用域内的对话列表 → 创作组(知识库/素材/原子/标签/图谱/选题/改写/发布) → 更多(折叠:笔记/技能/定时/浏览器/编程) | 用户选定方案；消除「顶部作用域 vs 底部 per-project 分组」双重项目概念，对话随项目走，首屏只剩主轴 |
| 重命名机制 | 内联编辑（Electron 无 window.prompt） | 项目/文件/对话统一双击或菜单内联改名 |
| 项目排序 | 上下箭头改 `sort`（reorderProjects 重写整列索引），暂不引入拖拽 | 拖拽留给 P3 的 Finder DnD；上下箭头零依赖、稳 |
| 项目归档 | migration 0016 加 `projects.archived`，归档移出切换器但保留数据、可恢复 | 与 conversations.archived 对齐 |
| 项目管理落点 | 切换器/管理菜单里的「管理项目…」打开 `ProjectsModal`（排序/归档/恢复/重命名/绑定/删除集中一处），当前项目的高频动作(归档/删除/重命名)同时留在 ProjectBar ⋯ 菜单 | 常用一键可达，批量管理进专用面板 |

**验证**：typecheck + vitest 151 passed + build；实跑 `npm run dev`（CDP 截图）确认新侧边栏与项目管理弹窗渲染正确、migration 0015/0016 上线零错误、真实 Obsidian vault 正常加载。

## 2026-06-24 — P2：Session ID 上下文迁移 + 空闲 Recap + 图片缩放

| 岔路口 | 选择 | 理由 |
|---|---|---|
| 「Session ID」是什么 | 就是 `conversation.id`（本地 UUID） | 历史全在本地 SQLite，无远程 session，比 Codex 更好做：贴 ID 即可本地直取全部历史 |
| 上下文注入方式 | `context_refs` 表(migration 0017)记录引用关系；发送时 `buildContextPreamble` 把被引用对话的完整历史拼成 system 前言，经 runChat 新增的 `systemPrefix` 参数(加法式，不覆盖 skills/materials/atoms)注入 | 不污染既有 system 构建；引用是持久的关系而非一次性粘贴；按 24k/80k 字符封顶防爆 |
| 引用入口 | Composer 上方「引用对话」chip 区：可粘贴 Session ID 或从最近对话选；对话菜单加「复制 Session ID」 | 两端都顺手；chip 可一键移除 |
| Recap 触发 | 对话有消息 && 非流式 && 空闲 60s → 1 次 LLM 生成 3 行 brief，卡片显示 + 可一键复制 Session ID | 对齐 Claude Code 习惯；省去去列表右键找 ID |
| 图片预览缩放 | 自研缩放/平移查看器(光标锚点滚轮缩放/拖拽/+−适应/双击)，非引第三方库 | 体量小、与设计系统一致 |

**验证**：typecheck + vitest 151 + build；实跑 `npm run dev`(CDP)——引用对话弹窗→选对话→chip 出现→✕ 移除全链路通过；migration 0017 零错误；图片缩放 100%→112% 实测。Recap 的实时 LLM 路径未自动触发(省 token，逻辑已 typecheck/build 通过)。

**P2 跟进修复（同日）**：
- **贴 Session ID 没被识别** → 在 `agent:query` 加拦截：消息若是「纯 conversation id」(`SESSION_ID_RE`)，则**短路不发模型**，直接 `addContextRef` + 回一条「✅ 已引入对话「X」的 N 条消息」并 `context:changed` 刷新 chip。实测：贴另一个对话 id → 即时引入、chip 出现、零 LLM 调用。
- **标题用第一句话而非内容** → 去掉「首条消息即标题」，改为首轮回复后用 `autoTitle()` 让模型起 6-16 字内容标题（仅当标题仍为默认「新对话」时，手动改名永远优先）。实测：发「请用一句话说明番茄工作法是什么」→ 自动命名「番茄工作法简介」。

## 2026-06-24 — P3-PR1：平铺窗格状态层（split → paneLayout）

| 岔路口 | 选择 | 理由 |
|---|---|---|
| 窗格模型 | 主工作区(跟随 `view`)恒为 slot0；`panes: SplitTarget[]`(0-3) + `layout` 五预设(single/col-2/row-2/col-3/quad) | 保留「主区跟导航」既有心智，只是把单一 `split` 泛化成可平铺的副窗格，风险最低 |
| 兼容旧调用点 | 保留 `setSplit/openSplitChat/closeSplit/toggleSplit` 作为「操作第一个副窗格」的兼容封装 | 侧边栏「在分屏打开」、⌘D、jumpTo 等无需改动 |
| 布局渲染 | CSS Grid + `gap-px bg-border` 画 1px 分隔线；每格 `min-h-0 min-w-0 overflow-hidden bg-background` | 零依赖、四象限/三栏都干净；暂用等分(1fr)，可拖拽改尺寸留后续 |
| 布局入口 | 顶部 WorkspaceTabs 右侧布局菜单(5 预设图标)，⌘D 仍快速开/关 | 一处切换、与既有顶栏一致 |

**验证**：typecheck + vitest 151 + build；CDP 实测——顶部菜单选「四象限」→ 渲染 2×2(主对话+3 副窗格)，每格独立内容选择器+关闭按钮，1px 分隔线正确。
**未做(留 P3-PR2)**：拖拽——侧边栏模块拖进窗格、窗格间拖拽重排、拖技能进对话、拖拽调尺寸。

## 2026-06-24 — P3-PR2：拖拽进窗格 + 自动扫描已安装 Skills

| 岔路口 | 选择 | 理由 |
|---|---|---|
| 拖拽实现 | 原生 HTML5 DnD（`dnd.ts` 封装 dataTransfer），不引 @dnd-kit | 签名交互（侧栏模块/对话拖进窗格、拖到右缘分屏）原生即可，轻 |
| 拖拽放置 | 拖拽时才挂载透明 `DropArea` 覆盖层（主区「在此打开」+右缘「拖到此处分屏」；副窗格「替换此窗格」），用 `dragActive` 门控 | 覆盖层不包裹内容→不挡正常交互、无 enter/leave 闪烁 |
| 「已安装 skills」的范围 | 扫 `~/.claude/skills`(个人) + `installed_plugins.json` 里各插件的 `installPath/skills`；**排除** `plugins/marketplaces/**`(目录是全量目录+agent 变体副本，非真安装) | 精确命中真正安装的，避开 1000+ 条目录噪音 |
| 已安装 skill 的状态 | 同步进 skills 表(source='installed', id=`inst:<path>`)，**默认停用**，启停状态保留；磁盘上没了就剪除；不碰 custom/imported | 复用现有启停+系统提示注入；默认停用避免 720 条灌爆每次 prompt |
| 扫描时机 | 启动时 `setImmediate` 跑一次(有界 MAX_FILES) + 「重新扫描」按钮；SkillsView 监听 data:changed 刷新 | 不阻塞启动；技能视图带 全部/已安装/自定义 过滤 + 搜索应对大量 |

**验证**：typecheck + vitest 151 + build；CDP 实测——拖「知识图谱」到右缘→新建窗格渲染真实关系图；启动扫描得 **720 条已安装技能**(默认全停用、enabled=0)，技能视图过滤/搜索/badge 正常。
**P3 后续(同日补完)**：
- **窗格拖拽重排**：窗格头加 grip 手柄，拖到另一窗格→`swapPanes` 交换；DnD 载荷区分 pane-target / pane-index / skill 三种 MIME，`dragActive`→带类型的 `dragKind` 门控放置层。
- **拖技能进对话**：SkillRow 可拖（skill 载荷），Composer 卡片为放置目标→把「请运用「X」技能：\n<内容>」插入输入框（本回合生效，无需全局启用）；`dragKind==='skill'` 时窗格放置层不拦截、输入框高亮。
- **拖拽调窗格尺寸**：`PaneGrid`(按 layout key 重挂载)用 fr 轨道 + 绝对定位分隔条，pointer 拖动在相邻轨道间转移 fraction(最小 8%)。
- **验证**：CDP 实测——分隔条 50/50→34/66；grip 拖拽交换 素材库↔知识图谱；拖 ads-review 技能→输入框出现「请运用「ads-review」技能：」。typecheck+151 tests+build 绿。

## 2026-06-24 — P4：新手引导（多步欢迎导览）

| 岔路口 | 选择 | 理由 |
|---|---|---|
| 引导形态 | 自研多步欢迎弹窗（5 步：项目=知识库 → 创作流 → 对话+贴SessionID迁移 → 分屏拖拽 → 技能自动扫描），不引 react-joyride | 零依赖、与设计系统一致、覆盖「了解操作流程」诉求 |
| 持久化 | `settings.onboarded`('1')；首启 `tourOpen=!onboarded`；跳过/完成/Esc 都算完成 | 只在首次自动弹；侧栏 `?` 按钮可随时重开 |

**验证**：typecheck + vitest 151 + build；CDP 实测——首启自动弹出(步骤「项目=一个知识库」)，下一步走到末步「技能自动扫描」+「开始使用」，`onboarded` 故意保持未设(留给你首次启动亲眼看到导览)。

### 导出对话到知识库 (.md) — 补完计划里「对话也在知识库里」
- 对话菜单「导出到知识库」→ 把对话(frontmatter + 每轮一节)写入项目 vault 的 `对话/<标题>.md`，重名自动 -2/-3，导出后在分屏打开。
- 纯函数 `formatConversationMarkdown` + `safeFileName`(净化非法文件名/截断 80) 已单测；目标项目按 对话所属→当前→任一已绑定 解析，无绑定则提示。
- **验证**：typecheck + vitest **157**(新增 6) + build；CDP 实测——导出「番茄工作法简介」→ vault `对话/番茄工作法简介.md` 生成并在分屏打开。

> **状态小结**：原计划 P1–P4 全部完成 + 创作者反馈全部增项（项目作用域/侧栏重整/项目删排归档/图片缩放/贴SessionID识别/内容自动起标题/技能自动扫描/拖拽三件套）+ 对话导出知识库。最终 typecheck + 157 tests + build + 实启动全绿。所有改动**未提交**（你没要求 commit）。
> 测试副作用：CDP 测试在你的 Obsidian vault 里留下了 `对话/番茄工作法简介.md`，以及几条测试对话（「番茄工作法简介」等）——可随手删。

## 2026-06-24 — 技能改 `/` 调用 + Finder 收藏（主区↔侧栏双向拖拽）

| 岔路口 | 选择 | 理由 |
|---|---|---|
| 技能调用模型 | 「启用」保留为**常驻**(注入每条消息)，新增 **`/slug` 按需调用**（Claude Code 式）：输入框打 `/` 弹技能选择器→插入 `/slug`，发送时 `buildInvokedSkillsPrompt` 按 slug 注入该技能内容(仅本条) | 用户期望的是 `/` 按需，而非全局常驻；两种并存 |
| slug 来源 | 已安装技能用磁盘文件夹名(`ads-review`)，自定义用 slugify(name，保留 CJK)；picker 插入与发送端解析同一函数 | 稳定、可读、一致 |
| 拖技能进对话 | 改为插入 `/slug`（不再预填内容） | 与 `/` 调用统一，干净 |
| Finder 收藏 | 侧栏「收藏」区为放置目标：拖窗格(grip 同时带 SplitTarget)/侧栏模块到此固定；收藏可点击打开、可拖回主区、可移除；`settings.favorites`(JSON) 持久化 | 实现「主区任意窗口拖到侧栏作 favorite，侧栏 item 拖到主区」的 Finder 互动；窗格 grip 现同时携带 pane-index(换位)与 target(收藏/打开) |

**验证**：typecheck + vitest **165**(新增 skill-slug 8 例) + build；CDP 实测——输入 `/ads` 弹出 `/ads-review` 等并插入；拖技能插入 `/slug`；拖「标签」到收藏→**重载后仍在**(确证持久化)→点击打开→移除。settings 持久化 raw round-trip 通过。

## 2026-06-24 — 收藏改可见 + 全条目「收藏/取消收藏」菜单 + 新手引导配截图

| 岔路口 | 选择 | 理由 |
|---|---|---|
| 收藏区不可见 | `FavoritesBar` 改**常驻显示**(空状态显示虚线放置框+提示，拖拽时高亮「松手收藏 ★」) | 之前空且非拖拽时隐藏→用户看不到/不会用；Finder 收藏栏一直在 |
| 非拖拽收藏入口 | `toggleFavorite(target)` + 导航模块(hover ★)、对话菜单、窗格头(★)、知识库文件菜单 | 满足「点按/菜单也能加移除收藏」；窗格除关闭外也能收藏 |
| 引导视觉 | 每步配**真实截图**(知识库/图谱/对话/分屏/技能，实跑抓取存 `assets/onboarding/`) | 「配合截图」；GIF 动图因合成拖拽不渲染拖影、难做好，先上静态 |

**验证**：typecheck + 165 tests + build；CDP——收藏区常驻；导航 ★ 切换 `[{view:tags}]` 持久化+出现在收藏+再点移除；引导首步显示知识库截图(retina 2360px)。已重置 favorites/onboarded（引导下次启动显示）。**动图**未做：需真机录屏+ffmpeg，可后续单独做。

- 逆向架构分析：`~/Downloads/牛马AI-electron-extract/ARCHITECTURE.md`
- 完整复刻方案(分阶段)：`~/Downloads/牛马AI-electron-extract/复刻方案.md`
- 本项目说明：`./README.md`
