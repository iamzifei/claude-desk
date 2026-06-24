# 实施计划：知识库(Vault) · 项目提级 · Finder 式拖拽分屏 · 上下文迁移 · 新手引导

> 日期：2026-06-23 ｜ 来源：与内容创作者访谈反馈 ｜ 产品：墨栖 (claude-desk)
> 本文是**动代码前的设计文档**。遵循全局规范「大改动先有书面计划、再窄切片实施」。

---

## 0. 已锁定的决策

| # | 决策点 | 选择 |
|---|--------|------|
| 1 | 知识库真相源 | **磁盘 `.md` 为本体**（Obsidian 真兼容，app 直接读写真实文件并监听外部变更） |
| 2 | 项目 ⇄ 知识库基数 | **1 项目 = 1 知识库**（v1；复用 `project.dir_path`） |
| 3 | 当前交付物 | 本计划文档；评审通过后再分期动代码 |

---

## 1. 现状盘点（好消息：约 60-70% 底子已具备）

| 创作者诉求 | 已存在的代码资产 | 缺口 |
|---|---|---|
| Obsidian 知识库 | `Workspace.root_path` / `Project.dir_path` 绑定文件夹；`files.listDir`(`ipc/index.ts`)；`link-parse.ts` 解析 `[[wikilink]]`；`WikiText`/`WikiTextarea`；`graph.ts`+`graph-build.ts`(关系图)；`materials`/`atoms`/`tags` | 不递归、不读/渲染/编辑 `.md`、不监听磁盘、真相源在 SQLite 而非文件 |
| 项目/知识库一等公民 | `projects` 表 + `db/projects.ts` + 侧边栏项目分组(`group-conversations.ts`) | 项目是「对话分组」二等概念；与 `Workspace` 文件夹字段冗余；未提到侧边栏顶部 |
| Finder 拖拽 + iTerm 分屏 | 模块已枚举为 `MainView`(chat/skills/materials/atoms/graph/files…)；单副窗格 `split: SplitTarget`(`store.ts`) | 只有 1 个副窗格、无平铺布局、无任何拖拽 |
| Session ID 上下文迁移 | 对话历史**全在本地 SQLite**(`messages` 表)；`conversation.id` = UUID；`links` 表可建关系 | 无「引入另一对话上下文」机制；无空闲 recap |
| 新手引导 | `OnboardingCard.tsx`（单步：载入示例数据） | 无多步引导/教学 |

**技术栈**：Electron 39 + React 19 + zustand + better-sqlite3 + `@anthropic-ai/sdk`(主对话) + `@anthropic-ai/claude-agent-sdk`(coding 子进程)。
**迁移机制**：`db/index.ts` 里 append-only `migrations[]` 数组 + `user_version` pragma —— 新增表只需往数组尾部追加。
**布局**：`App.tsx` → `WorkspaceTabs` + `Sidebar`(232px) + `ChatView`；分屏逻辑目前在 `ChatView` 内部。

> **重要事实**：主对话用原生 `@anthropic-ai/sdk`，**没有 Claude Code 远程 session**。所以「Session ID」在墨栖语境下 = `conversation.id`，全文历史本地可得 —— 上下文迁移比 Codex 更好做，无需远程拉取。

---

## 2. 分期总览

```
P1  知识库(磁盘 .md 读写 + 监听) + 项目提级为一等公民     ← 最核心、工程量最大
P2  上下文迁移(贴 session id) + 空闲 recap                ← 最小最快见效，可穿插
P3  平铺窗格(2列/2行/四象限/三栏) + Finder 式拖拽          ← 最重的 UI 重构
P4  多步新手引导                                          ← 收尾，依赖 P1-P3 落地
```

建议顺序：**P1 → P2 → P3 → P4**。P2 体量小、风险低、用户感知强，若想先尝甜头可把 P2 提到 P1 之前。

---

## 3. P1 — 知识库（磁盘为本体）+ 项目提级

### 3.1 核心架构：文件为真相，SQLite 为派生索引

```
磁盘 vault 文件夹 (project.dir_path)  ← 唯一真相源
        │  读 / 写 / fs.watch
        ▼
  主进程 VaultService
        │  扫描 .md → 解析 frontmatter + 正文 + [[wikilinks]]
        ▼
  SQLite vault_files / vault_links  ← **派生缓存**(可随时重建, 不是本体)
        │
        ▼
  渲染层：文件树 + Markdown 编辑/预览 + 关系图
```

**关键原则**：磁盘改了 → watcher 触发 → 重新索引 → UI 刷新。app 内编辑 → 防抖写盘 → watcher 触发 → 重新索引。SQLite 里的 `vault_*` 表**任何时候删了都能从磁盘重建**，因此不怕不一致。

> 与现有 `materials`/`atoms`/`topics`(SQLite 原生创作资产)的关系：**v1 不迁移它们**。Vault 是「磁盘文件视图」，与「结构化资产库」并存。后续可提供「资产 ⇄ .md 双向导出」。创作者说的「把对话也丢进知识库」→ 提供**「对话归档为 .md」**动作，而非把对话存储迁出 SQLite。

### 3.2 数据模型改动（追加到 `db/index.ts` migrations[]）

```sql
-- 派生缓存：单一 vault 内的文件索引（可重建）
CREATE TABLE vault_files (
  project_id TEXT NOT NULL,
  rel_path   TEXT NOT NULL,          -- 相对 vault 根的路径
  title      TEXT,                   -- frontmatter.title 或文件名
  frontmatter TEXT,                  -- 原始 YAML(JSON 化)
  mtime      INTEGER NOT NULL,
  size       INTEGER NOT NULL,
  PRIMARY KEY (project_id, rel_path)
);
CREATE TABLE vault_links (           -- [[wikilink]] 派生关系，喂给关系图
  project_id TEXT NOT NULL,
  src_rel    TEXT NOT NULL,
  dst_title  TEXT NOT NULL,          -- 目标标题/文件名（解析到 dst_rel 可为空=未解析）
  dst_rel    TEXT
);
```
> 不给 vault 正文建全文表（v1 用磁盘按需读；FTS5 留 P1.5 优化项，有 benchmark 再上）。

### 3.3 主进程新增 `VaultService`（`src/main/vault/index.ts`）

- `scan(projectId, root)` → 递归遍历(忽略 `.obsidian/`、`node_modules`、`.git`、二进制)，解析每个 `.md`，写入 `vault_files`/`vault_links`。
- `watch(projectId, root)` → 用 **`chokidar`**(新依赖) 监听增删改，增量更新索引，向渲染层 `webContents.send('vault:changed', {projectId})`。
- `readFile(root, relPath)` / `writeFile(root, relPath, content)`：边界校验（限制在 root 内，复用 `net/url-guard.ts` 同款路径守卫思路，防穿越）。
- `tree(projectId)` → 返回嵌套目录树给渲染层。
- `frontmatter`：引入 **`gray-matter`**(新依赖) 解析 YAML。
- 复用现有 `link-parse.ts` 抽取 `[[...]]`；`graph-build.ts` 增加「从 vault_links 构图」分支，让现有关系图直接渲染 vault 里的人物关系。

### 3.4 IPC / preload 新增（`ipc/index.ts` + `preload/index.ts` + `.d.ts`）

```ts
vault: {
  tree:     (projectId: string) => Promise<VaultNode>          // 递归目录树
  read:     (projectId: string, rel: string) => Promise<string>
  write:    (projectId: string, rel: string, content: string) => Promise<void>
  create:   (projectId: string, rel: string, kind: 'file'|'dir') => Promise<void>
  rename:   (projectId: string, from: string, to: string) => Promise<void>
  remove:   (projectId: string, rel: string) => Promise<void>
  reindex:  (projectId: string) => Promise<void>
  onChanged:(cb: (projectId: string) => void) => () => void
}
```

### 3.5 渲染层

- **升级 `FilesView.tsx` → `VaultView.tsx`**：递归树、展开/折叠、新建/重命名/删除、点击文件在右侧（或分屏）打开。
- **新增 `MarkdownEditor.tsx`**：左编辑(textarea，复用 `WikiTextarea` 的 `[[]]` 自动补全) / 右预览(`react-markdown` + `WikiText`)，防抖 600ms 写盘。
  - 冲突处理：打开时记录 `mtime`；写盘前比对，若外部已改且本地有未保存改动 → 顶部冲突条「保留我的 / 重新载入」。v1 不做三方合并。
  - 编辑器升级到 **CodeMirror 6** 列为 P1.5 可选项（更好的 md 体验），v1 先 textarea。
- **`MainView` 增加 `'vault'`**；`SplitTarget` 增加 `{ kind: 'vault-file'; projectId; rel }`，使 .md 文件可进分屏。

### 3.6 项目提级为侧边栏一等公民（`Sidebar.tsx`）

- 顶部新增「**项目 / 知识库**」区：当前项目名 + 切换器 + 「打开知识库文件夹」「新建知识库」。
- 复用现有 `bindProjectDir`(`store.ts`)：选文件夹即绑定为该项目 vault → 触发 `vault.scan` + `watch`。
- 当前对话所属项目高亮；项目下挂「Vault 文件树 / 对话 / 关系图」三入口。
- **冗余收敛**（DECISIONS.md 记一笔）：v1 把「项目=知识库」作为主心智，`Workspace` 维持为顶层多项目容器；不强行删 `root_path`，但 UI 不再暴露 workspace 级文件夹，避免双重「绑定文件夹」入口困惑。

### 3.7 P1 验收

- [ ] 选一个真实 Obsidian vault 文件夹 → 文件树正确递归、`.md` 可打开渲染、`[[链接]]` 可点击跳转。
- [ ] app 内编辑保存 → 文件在 Finder/Obsidian 里内容同步变化。
- [ ] 在 Obsidian 里改同一文件 → app 文件树/正文自动刷新。
- [ ] 关系图能渲染 vault 内 `[[]]` 形成的人物关系。
- [ ] `npm run typecheck && npm run test` 通过；新增 `tests/vault.test.ts`(扫描/解析/路径守卫)。

---

## 4. P2 — 上下文迁移(贴 Session ID) + 空闲 Recap

### 4.1 上下文迁移

- **「Session ID」= `conversation.id`**。新对话引入旧对话上下文的方式：
  1. Composer 增加「引入对话上下文」按钮 / 或粘贴/`@` 提及一个 conversation id。
  2. 主进程 `conversations.contextOf(id, mode)`：
     - `mode='full'`：注入全文历史。
     - `mode='digest'`(默认)：1 次 LLM 调用生成结构化摘要(复用 `run.ts` 模式)，避免上下文爆炸。
  3. `run.ts` 发送前，把引用上下文作为 system 前言或合成首轮注入。
  4. 持久化引用：复用 `links` 表(`src=conversation, dst=conversation, type='context-ref'`)，让引用关系长期可见、可在关系图体现。
- 体验对齐 Codex「贴 ID 即同步」，但本地直取、零延迟。

### 4.2 空闲 Recap

- 渲染层加空闲计时器：`有消息 && 60s 无输入 && 流式结束` → 调 `conversations.recap(id)`(1 次 LLM 调用) → Composer 上方弹卡片：
  - 3 行 brief（这段对话在干嘛、产出了什么、下一步建议）。
  - **可一键复制的 Session ID**（= conversation.id），省去去列表右键。
  - 可关闭；同一对话同一轮只弹一次。
- 复用 `OnboardingCard` 的卡片样式与 `scheduler` 的节流思路。

### 4.3 数据模型 / IPC

```ts
conversations.contextOf(id, mode: 'full'|'digest') => Promise<string>
conversations.recap(id) => Promise<{ brief: string; sessionId: string }>
```
- `links` 表已存在，无需新表。

### 4.4 验收

- [ ] 新对话贴入旧对话 id → 模型确实「记得」旧对话内容。
- [ ] 空闲 60s 出 recap 卡片，复制按钮拿到正确 id。
- [ ] `typecheck + test` 通过；`tests/context-ref.test.ts`。

---

## 5. P3 — 平铺窗格 + Finder 式拖拽（最重）

### 5.1 布局模型：预设槽位（不做任意二叉树，覆盖 iTerm 用例且复杂度可控）

```ts
type PaneContent =
  | { kind: 'chat'; id: string }
  | { kind: 'view'; view: MainView }
  | { kind: 'vault-file'; projectId: string; rel: string }

type LayoutPreset = 'single' | 'col-2' | 'row-2' | 'col-3' | 'quad'
interface PaneLayout { preset: LayoutPreset; slots: (PaneContent | null)[] }  // slots 数量随 preset
```

- 用 **`store.ts` 的 `paneLayout: PaneLayout`** 取代现有 `split: SplitTarget | null`（保留 `toggleSplit` 兼容：等价于 `single ↔ col-2`）。
- 渲染：`PaneGrid.tsx` 按 preset 渲染 CSS Grid，每格一个 `Pane` 渲染对应 `PaneContent`；格间分隔条可拖拽调宽高(`sizes[]`)，可单格关闭(→ 该 slot=null，自动降级 preset)。
- 布局持久化进 settings（每项目记忆）。

### 5.2 拖拽（引入 **`@dnd-kit`** 新依赖）

| 拖拽来源 → 目标 | 行为 |
|---|---|
| 侧边栏模块 → 侧边栏置顶区 | 固定为快捷方式(pin)，可重排 |
| 侧边栏模块/对话/文件 → 某窗格槽位 | 在该槽打开它（分屏） |
| 技能 → 某个对话窗格 | 把技能引用插入该对话 Composer |
| 窗格 ↔ 窗格 | 交换/重排槽位内容 |
| 窗格标题条 → 边缘 | 切换 preset（拖到右半=col-2…）（v1 可先用工具栏按钮选 preset，拖拽切布局留 P3.5） |

- 侧边栏置顶快捷方式：新增持久化 `pinned_items`（settings JSON 或新表 `pinned(kind,ref,sort)`）。

### 5.3 验收

- [ ] 可在 single/2列/2行/四象限/三栏间切换；每格内容独立。
- [ ] 从侧边栏拖一个模块进某格成功打开；拖技能进对话成功引用。
- [ ] 置顶快捷方式可拖动重排并持久化。
- [ ] `typecheck + test` 通过；`PaneGrid` 降级逻辑有单测。

> 风险：这是最大重构。务必**先把 `split`→`paneLayout` 的状态层换干净并保绿，再叠加 DnD**，分两个 PR。

---

## 6. P4 — 多步新手引导

- 升级 `OnboardingCard` → 多步教学 tour（自研 coach-marks，或引入 `react-joyride`）。
- 步骤脚本：①打开/新建知识库 → ②在 Vault 里编辑一个 .md → ③把模块拖进侧边栏置顶 → ④四象限分屏 → ⑤把技能拖进对话 → ⑥贴 Session ID 迁移上下文。
- 首次启动自动触发，可「跳过 / 以后再说」，状态存 settings。

---

## 7. 跨期：新增依赖与风险

| 依赖 | 用途 | 期 |
|---|---|---|
| `chokidar` | vault 文件监听 | P1 |
| `gray-matter` | frontmatter 解析 | P1 |
| `@dnd-kit/core` | 拖拽 | P3 |
| `@codemirror/*`(可选) | md 编辑器升级 | P1.5 |
| `react-joyride`(可选) | 引导 | P4 |

**实施纪律（全局 CLAUDE.md 范围纪律）**：每期内部按 5-10 文件窄切片，每切片跑 `typecheck + lint + test` 再继续；绝不一次性铺 30+ 文件。所有单测集中在 `tests/`。性能相关（递归扫描大 vault、FTS）必须带 benchmark 数据再决定优化。

## 8. 需要你手动确认/提供的事项

1. 是否同意 v1 **不迁移** `materials/atoms/topics` 到磁盘（Vault 与结构化资产库并存，后续再做双向导出）？
2. 「对话归档为 .md 进 Vault」是否要进 P1（创作者明确说"对话也在库里"），还是放 P2？
3. P3 拖拽切布局（拖到屏幕边缘改 preset）是否 v1 必需，还是可先用工具栏按钮选布局？
4. 引导是否接受引入 `react-joyride`，还是要纯自研无新依赖？

---

*下一步：你审完本文，确认上面 4 点 + 分期顺序，我就从选定的那一期开始按窄切片实施。*
