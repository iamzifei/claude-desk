# 对齐牛马AI —— 信息架构还原 + 分阶段对齐计划

> 来源:对 `牛马AI-1.0.288-arm64-mac.dmg` 提取代码的逆向(截屏被 macOS 录屏权限挡住,
> 改用代码考古)。还原依据:412 个 IPC 通道 + store/组件名 + **未混淆的中文 UI 文案** + FlexLayout。

---

## 一、牛马AI 真实信息架构(还原结论)

**布局范式**:`FlexLayout`(IDE 式可停靠标签面板)+ react-resizable-panels。
不是简单 sidebar+chat,而是**类 VS Code 的多面板工作区**。Tailwind 驱动样式。

**核心层级**:Workspace(工作区) → Project(项目) → Conversation(会话,可多标签开)

**界面区块(从中文文案 + store 名还原):**

| 区块 | 还原到的元素 |
|---|---|
| 左栏 | `新对话`/`新建对话`、`搜索`、会话列表按 `今天/昨天/更早` 分组、每条 `重命名`/`归档`/`删除`/`更多` |
| 主区 | `ConversationTab` 会话标签页(可多开) |
| 输入区 | 模型选择器(`模型`)、`工具`/`更多工具`、`语音输入`、`创建任务` |
| 右侧可停靠面板 | `卡片预览`(画布编辑器:`背景/圆角/字号/内边距/边框/颜色规范/透明度/字体`,导出 `图片`/`PDF`/`PNG`)、`文件`、`浏览器`、终端 |
| 技能市场 | `创建 Skill`、`搜索 Skill...`、`已安装`/`已禁用`/`安装失败`/`重试安装` |
| 设置 | 账号(`退出登录`/`用户名`)、模型(`复制密钥并粘贴到下方输入框`)、外观(`深色模式`)、`版本`、`反馈` |
| 集成 | `飞书`、`微信`(IM 机器人) |
| 独立功能 | `会议纪要`、`每日回顾`、`定时任务` |

完整 412 通道功能清单见 `~/Downloads/牛马AI-electron-extract/ARCHITECTURE.md`。

---

## 二、本项目对齐进度

### ✅ Phase A —— shell + 聊天信息架构(已完成,本次)
对齐了**可见布局和核心聊天 IA**:

- **无边框自定义标题栏**(frameless,mac 原生红绿灯 + 自绘可拖拽栏)→ `titleBarStyle: hiddenInset`
- **左栏**:`新对话` + `搜索`(标题+正文全文搜)+ 会话列表**按 `今天/昨天/更早` 分组** + 每条 `重命名/归档/删除` 菜单 + 底部导航栏(技能[stub]/设置)
- **会话标签页**(TabBar):会话可多开成 tab,可切换/关闭(对齐 ConversationTab)
- **输入区**:**内联模型选择器**(每会话可独立设模型)+ `工具`/`语音输入`(stub,占位对齐)
- **右侧可停靠面板**(RightDock + RightPanel):`卡片预览`/`文件`/`浏览器` 三个面板的**结构占位**(图标条切换),功能后续接入
- 深色主题、全中文 UI、暖琥珀强调色

**数据层**:会话表加 `model`(每会话模型)+ `archived`(归档);新增 search/archive/setModel IPC。
**API key**:支持从 Settings、`process.env`、`~/.env` 三级回退读取 `CLAUDE_API_KEY`,开箱即回。

验证:typecheck 0 error;build 通过;Electron 启动零错误(migration 0002 干净应用)。
**唯一没自动验证**:真实渲染界面 + 点一次发消息(需你手动跑 `npm run dev`,30 秒)。

### ⏳ Phase B —— 高价值面板(建议下一步,挑 1-2 个)
- **卡片预览/画布编辑器**:把 AI 回复导出成卡片图片/PDF/PNG(牛马AI 的特色,CardPreview 是它最大的独立 CSS)
- **技能市场(Skills)**:搜索/安装/启用 skill;本地 skill 管理
- **项目(Projects)**:Workspace→Project→Conversation 完整层级 + 项目内文件
- **定时任务 / 每日回顾 / 会议纪要**

### ⏳ Phase C —— 重集成(工作量大)
- **真·编程能力**:把引擎从 `@anthropic-ai/sdk` 换成 `@anthropic-ai/claude-agent-sdk`(能改文件/跑命令/工具)——这是"Claude Code"的核心
- **内嵌终端**(node-pty + xterm)、**浏览器自动化**、**语音转写**(sherpa-onnx)
- **IM 机器人**(飞书/微信/Discord/Telegram)
- **FlexLayout 真·可拖拽停靠**(目前右面板是固定停靠,非自由拖拽)

---

## 三、和牛马AI 的差距(诚实记录)

| 维度 | 牛马AI | 本项目 Phase A |
|---|---|---|
| 布局范式 | FlexLayout 自由拖拽停靠 | 固定三栏 + 可切换右面板(视觉对齐,非自由拖拽) |
| 层级 | Workspace→Project→Conversation | 扁平 Conversation + 多标签(Project 待 Phase B) |
| AI 能力 | claude-agent-sdk(改文件/工具/终端) | 纯对话流式(Phase C 升级) |
| 面板 | 卡片/文件/浏览器/终端全功能 | 结构占位 stub |
| 集成 | 飞书/微信/语音/技能市场 | 待 Phase B/C |

**核心判断**:可见的**布局骨架和聊天体验已对齐**;牛马AI 的护城河在"集成广度 + 画布/技能",这些是 Phase B/C 的增量,不影响主体观感。

---

## 3.5 进度更新（夜间自主 session 2）

拿到录屏权限后,截了**真实牛马AI**(`docs/reference/niuma-main-layout.png`)并据此重做了布局,又按你的要求换成 **shadcn/ui + lucide 图标**。

**已完成:**
- ✅ **Projects 数据层**:Workspace→Project→Conversation 三级 + 项目绑定文件夹 + 文件面板(migration 0003)
- ✅ **按真实布局重做**:顶部工作区横标签、左栏功能菜单(新建对话/搜索/定时任务/浏览器/Skill管理/每日回顾)、最近对话/归档分组、底部用户资料、输入区联网开关 + 预设 chips、时间感知问候
- ✅ **浅色暖调主题**(对齐牛马AI 默认)
- ✅ **shadcn/ui 重构**:Tailwind v4 + Radix + CVA(= 牛马AI 自己的栈),ui/ 下 button/input/dialog/dropdown-menu/tooltip primitives
- ✅ **全部 emoji → lucide SVG 图标**(无一处 emoji)
- ✅ **API key 三级回退**(设置/env/`~/.env`),`~/.env` 的 CLAUDE_API_KEY 开箱即用

**验证(全部实跑通过):**
- typecheck 0 error;build 通过
- **截图自检**(Quartz 按窗口 ID 截图):见 `docs/reference/claude-desk-shadcn.png`,与牛马AI 高度一致
- **CDP 驱动真实 app 端到端发消息**:返回真实 Claude 回复「这句话本身就是我在这个app里的正常回复…✓」——证明 `可以得到ai回复` 在真 app 里成立(用 `~/.env` 的 key)

## 3.7 卡片预览/导出(Phase B,已完成)
牛马AI 的招牌差异化功能。把 AI 回复渲染成可调样式的卡片并导出:
- 背景预设(米白/纯白/天青/暮光/墨黑)+ 宽度 + 内边距 + 圆角
- 导出:**复制图片**(剪贴板)/ **PNG**(保存对话框)/ **PDF**
- **关键决策**:做卡片时 npm registry 不可达,装不上 `html-to-image`/`jspdf`。于是改用 **Electron 原生能力**实现(更可靠、零依赖、离线可用):
  - `webContents.capturePage(rect)` 截卡片区域为高清 PNG(retina 2x)
  - 离屏窗口 + CSS `@page` + `printToPDF` 生成单页 PDF
- 验证(CDP):capture 返回合法 PNG、pdfFromImage 返回合法 `%PDF`;面板 UI 见 `claude-desk-card.png`

## 3.8 定时任务 / 每日回顾 / 会议纪要(已完成)
左栏导航现在切换主区视图(chat / scheduled / review / minutes):
- **定时任务**:配置「每天 HH:MM」或「每隔 N 分钟」跑一段提示词;主进程 `scheduler.ts` 每 30s 检查到期任务,用 `runOnce` 跑完,结果存成一条新对话;支持 启用/停用、立即运行、删除。
- **每日回顾**:汇总今天的对话 → 生成一份结构化回顾(要点/决策/待办/记忆点),存为 note。
- **会议纪要**:粘贴会议记录/转写 → 生成结构化纪要(摘要/要点/决策/行动项),存为 note。
- 共用 `runOnce()` 一次性引擎;`data:changed` 广播让定时任务结果自动出现在列表。
- 验证(CDP):定时任务 runNow 创建了带 AI 回复的对话;会议纪要从转写生成了 387 字纪要;视图与导航高亮均正确。截图 `claude-desk-scheduled.png` / `claude-desk-minutes.png`。

## 3.9 语音输入/转写(已完成)
输入框麦克风按钮:录音 → 转写 → 文字插入输入框,带 录音中/转写中 状态。
- **决策**:牛马AI 用 sherpa-onnx 离线 ASR(无 key 但要下 ~230MB 模型 + 原生模块 + 无法对麦克风自测)。本项目改用**云端 OpenAI 兼容 `/audio/transcriptions`**(可配置端点/模型/key,key 回退到 `~/.env` 的 OPENAI_API_KEY)——更轻、可验证;端点可指向 **SiliconFlow 托管的 SenseVoice**(牛马AI 同款模型,有免费额度)。
- **工程坑**:Electron 主进程 fetch 的 FormData/Blob 跨 realm 会失败 → 改成**手搓 multipart Buffer**。
- **验证**:转写逻辑在 plain Node 22 用真实 key 跑通(HTTP 200 + 正确识别 macOS `say` 合成的英文句子)。沙箱里 Electron 进程连不到 api.openai.com(connect timeout;Anthropic 可达、OpenAI IP 不可达)——网络出口问题,非代码问题,在能访问端点的网络上即可用。设置「语音转写」区 + 麦克风按钮截图 `claude-desk-voice.png`。

## 3.10 浏览器自动化(已完成)
左栏「浏览器」→ 内嵌浏览器(`<webview>`)+ AI agent。
- **内嵌浏览器**:地址栏 + 前进/后退/刷新,能加载真实外网。
- **AI agent loop**:截图 + 注入 JS 提取可交互元素(打 `data-cda-idx` 标记)→ Claude **视觉**用强制 tool-use 选下一步动作(click/type/navigate/scroll/done)→ 在 webview 里执行 → 循环(最多 12 步)+ 步骤日志。这就是 browser-use 那套「截图+元素索引」范式。
- **完整端到端验证(CDP 实跑)**:webview 加载 example.com → AI 决定点击 [0] Learn more → 跳转到 iana.org → 识别新页面 → 给出正确结论「跳转到了 https://www.iana.org/help/example-domains」。全程自主完成。截图 `claude-desk-browser.png`。
- 这是本会话验证最充分的功能(沙箱里 webview 能联网 + Anthropic 可达,全链路真跑通)。

## 3.6 视觉记录(docs/reference/)
- `niuma-main-layout.png` — 真实牛马AI(对齐基准)
- `claude-desk-shadcn.png` — 本项目空状态(浅色,shadcn+lucide)
- `claude-desk-chat.png` — 对话中(markdown/代码块/思考折叠渲染)
- `claude-desk-dark.png` — 深色模式

新增:**深色模式**(token 化,设置里 浅色/深色 切换,持久化)——对齐牛马AI 深色模式。

## 四、需要你拍板
醒来后告诉我 **Phase B 先做哪个**:
1. 卡片预览/导出(最出彩、最像牛马AI 的差异化)
2. 技能市场
3. 项目层级(Workspace/Project)
4. 直接上 Phase C 的真·编程 agent(claude-agent-sdk)

我按你选的继续。
