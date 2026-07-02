# 写作 Skills 更新 × lingxi / InkNest 双端统一方案

> 2026-07-02 · 基于三份调研：lingxi 技能体系与管道、詹有才知识库李同学内容/流量框架、InkNest v1.5.1 现状
> 红线：所有李同学框架内容已做内化处理，产品内不点名、不搬原话。

---

## 0. TL;DR

1. **写作 skills 更新**：现有 8 个 lingxi 内置技能偏"长文 + 理论"（哲学/心理钩子），李同学框架补上缺失的另一半——**供需选题、短视频三类脚本、文案两原则、人设五维、数据反馈闭环**。方案 = 升级 4 个现有 skill + 新增 3 个 skill。
2. **双端统一**：lingxi 和 InkNest 的技能格式**已经都兼容 Claude Code SKILL.md**——这是最大的架构红利。建一个共享技能仓库作为唯一事实源，两端消费同一套技能、同一条 6 阶段创作流水线、同一套人设配置、同一套术语。差异只留在"部署与付费"这一层。
3. **分四期落地**：共享技能仓库 → lingxi 接入 → InkNest 补齐（内置技能 + 引导式流水线 + 人设配置）→ 数据反馈闭环。

---

## 1. 三方现状盘点

### 1.1 lingxi（线上付费版）

- **定位**：面向不懂技术的小白创作者，注册即用、按量计费（人民币微元）、微信支付充值。
- **8 个内置技能**：find-topic（爆款选题）、chinese-viral-writer（爆款写作）、fact-check、content-evaluation（7 维审稿）、humanizer-zh（去AI味）、cover-title、baoyu-article-illustrator、baoyu-cover-image。
- **6 阶段管道**：Topic → Strategy（4D 策略）→ Writing（写作 + 自动评估循环）→ Humanizer → Images → Format（6 平台排版）。
- **技能系统**：SKILL.md 格式（YAML frontmatter + Markdown），支持用户上传 .md/.zip，隐式打分匹配 + `/slug` 显式触发。存储在 Supabase（`lingxi_skills` 表）+ `public/builtin-skills/`。
- 关键文件：`src/lib/skills/registry.ts`、`src/lib/pipeline.ts`、`src/lib/prompts/pipeline-phases.ts`。

### 1.2 InkNest（本地免费版，本仓库）

- **定位**：内容创作者的素材库 × AI 创作台，本地优先、BYO-key（自带 AI 账户）、无后端。
- **创作链路**：素材库 → 知识原子 → 知识图谱 → 选题库 → 对话创作 → 改写工坊（8 平台预设）→ 存回素材库。
- **技能系统**：完全兼容 Claude Code SKILL.md；自动扫描 `~/.claude/skills` 和插件目录；`/` 选择器按需调用（仅本条消息）或设置里永久启用。**当前不预装任何技能**。
- **v1.5.x 已有**：知识库（Obsidian vault 双向同步）、分屏、收藏夹、上下文接力、知识图谱、新手引导。
- 关键文件：`src/main/db/skills.ts`、`src/main/db/skill-parse.ts`、`src/main/agent/installed-skills.ts`、`src/main/agent/platform-presets.ts`。

### 1.3 李同学内容/流量框架（詹有才知识库）

内容体系：
- **定位论**：从竞争对手出发找空位；产品/人设由流量反推（先内容→看评论→再定产品）。
- **选题 = 供需关系**：高需求 + 低供给 = 大流量；热点（前 4 小时）/ 产品介绍（无需求无流量）/ 用户真实需求（需调研）三类方程。
- **开头期待感三形式**：不稳定情绪 / 圈定人群 / 反认知。
- **文案两原则**：特写镜头原则（抽象→可见细节）、小宝宝原则（讲给完全不懂的人听）。
- **三类脚本框架**：情绪/观点（总分总 + 嘴替路由）、故事（磨难 6 型 × 转机 7 型五段框架）、干货（7±2 清单 + 18 秒出动作）。
- **人设五维**：过去（故事）/ 专业（干货）/ 观点态度 / 结果实力 / 生活温度——每条内容指向一维，累积成立体人设。

流量体系：
- **赛马机制**：同领域·同类型·同时长·同等级·同时间 PK → 垂直 + 固定节奏是算法层面的最优解。
- **信息密度 + 稀缺性**：短视频的"短"是密度的短；收藏率 > 点赞率 = 干货价值信号。
- **基础播放量 > 单条爆款**：每条都有流量比赌爆款重要。
- **人 > 内容的算法转变**：从"内容推荐内容"到"从人推荐内容"。
- **数据反馈闭环**（James 的护城河）：喂对标数据 + 自身数据 → AI 学"为什么这条火" → 每稿打分迭代。

来源：`詹有才/01-原始素材区/学习-短视频创作/_方法论提炼.md`、`_脚本模板.md`、`02-内容单元库/`（30+ 单元）、`对标-李同学抖音/`（100 条视频数据）。

---

## 2. 写作 Skills 更新方案

### 2.1 差距分析：现有技能 vs 李同学框架

| 李同学框架模块 | 现有技能覆盖情况 | 结论 |
|---|---|---|
| 供需关系选题 / 赛马定位 | find-topic 只有理论钩子（哲学/心理），无供需扫描、无对手分析 | **升级 find-topic** |
| 开头期待感三形式 | chinese-viral-writer 有 4D 钩子但无此三分法 | **升级 chinese-viral-writer** |
| 文案两原则（特写/小宝宝） | humanizer-zh 只做"去除"，缺"注入具象"的正向准则 | **升级 humanizer-zh + writer** |
| 三类脚本框架（短视频） | 完全空白——现有技能全是长文导向 | **新增 script-writer** |
| 人设五维 / 内容日历 | lingxi 有品牌配置但字段是风格/禁用词，无人设维度；InkNest 无品牌概念 | **新增 persona-builder** |
| 信息密度/稀缺性/收藏价值评估 | content-evaluation 7 维里没有这些 | **升级 content-evaluation** |
| 数据反馈闭环 | 两端都没有 | **新增 content-feedback** |

### 2.2 升级 4 个现有技能

**① find-topic v2（爆款选题）**
- 新增 Phase 0「供需扫描」：先判断选题属于哪类方程（热点/产品介绍/真实需求），产品介绍类直接预警"无需求=无流量"。
- 新增「空位定位」步骤：列出该赛道 3-5 个对标账号，找"做得不一样/更细分"的空位（律师→网红主播的律师 这类思路，内化表述）。
- 筛选评分维度中加入「供需分」：高需求+低供给加权最高。
- 保留现有理论钩子体系（哲学/心理/传播/社会）——它和供需是互补关系：供需决定"有没有流量"，钩子决定"能不能抓住"。

**② chinese-viral-writer v2（爆款写作）**
- 开头生成强制走「期待感三形式」：每篇产出 3 个开头候选（不稳定情绪版 / 圈人群版 / 反认知版），让用户选而非 AI 独断。
- 写作约束注入「文案两原则」：特写镜头（禁抽象词，需要解释的词都不是好文案）+ 小宝宝原则（一句一个意思，听一遍就懂）。
- Brief 中新增「本条内容指向人设哪一维」字段（与 persona-builder 联动）。

**③ content-evaluation v2（内容审稿）**
- 7 维扩为 8 维，新增「信息密度与稀缺性」（信息够多 + 够陌生；"这些点读者听过没有"）。
- 「互动潜力」维度细分出收藏价值信号（干货类内容以"值得存"为准，而非"看着爽"）。
- 新增「目标群体清晰度」检查项：这篇讲给谁听，一句话能不能说出来。

**④ humanizer-zh v2（去AI味）**
- 在 9 种特征识别之外，加「正向注入」段：小宝宝原则改写指引（行话→白话）+ 特写镜头改写指引（抽象结论→可见细节）。
- 保持"去除 + 注入灵魂"的双向理念不变。

### 2.3 新增 3 个技能

**⑤ script-writer（短视频脚本）— 一个技能三种模式**

```yaml
---
name: script-writer
description: 短视频脚本创作 — 情绪/故事/干货三类框架，自动判断或手动指定
triggers: [/script, /脚本, /短视频脚本]
---
```
- **情绪/观点模式**：总分总结构；开头抛观点+圈人群+造盟友与敌人；3-4 个高分值论点（具象、一句戳中）；两条嘴替路由（给"想做没做成"一个体面理由 / 给"不想做"一个站得住的理由）。
- **故事模式**：五段框架（钩子→磨难→转机→更大磨难→转机收感悟）；内置磨难 6 型 × 转机 7 型题材库；全程具象细节；附"挖故事 20 题清单"帮用户从真实经历取材（卖真不卖梦红线内置）。
- **干货模式**：7±2 法则；第 18 秒内出现可照做动作；收藏导向（信息够多+够陌生）。
- 共享质检清单：文案两原则 + 开头三形式 + 目标群体明确。

**⑥ persona-builder（人设五维）**

```yaml
---
name: persona-builder
description: 人设五维构建 — 过去/专业/观点/实力/生活，生成品牌配置和内容日历
triggers: [/persona, /人设]
---
```
- 引导式问答，产出结构化人设档案（五维各 2-3 条素材点）。
- 生成「内容日历建议」：每周各维度的发布配比（专业每周 1、观点每周 1、故事每月 1-2、实力每月 1-2、生活不定期）。
- 输出格式同时兼容 lingxi 品牌配置（写入 `lingxi_brands`）和 InkNest 本地人设配置（新功能，见 §3.4）。
- 内置"每条内容有目的"检查：任何选题/成稿都应能回答"指向人设哪一维"。

**⑦ content-feedback（数据复盘闭环）**

```yaml
---
name: content-feedback
description: 内容数据复盘 — 喂入发布数据，分析为什么火/不火，迭代创作参数
triggers: [/feedback, /复盘]
---
```
- 输入：近期发布内容的数据（播放/点赞/收藏/评论/完播，MVP 阶段手动粘贴）。
- 分析：按李同学指标体系解读——干货看收藏率、破圈看转发评论、健康度看基础播放量趋势（而非单条爆款）。
- 输出：3 条可操作调整（选题方向/开头形式/脚本类型/发布节奏），并生成一段「本周创作参数」可注入后续写作的系统提示。
- 这是 Level-3 闭环的 MVP：数据→规律→反馈到下一稿。

### 2.4 技能落盘位置

个人 `~/.claude/skills/` 下的同名技能同步更新（find-topic、chinese-viral-writer、content-eval、humanizer-zh 已在个人技能列表中）。唯一事实源见 §3.2。

---

## 3. lingxi / InkNest 双端统一方案

### 3.1 统一原则

> **一套技能、一条流水线、一种语言；差异只在部署与付费。**

| 层 | 统一策略 |
|---|---|
| 技能层 | 同一套 SKILL.md，一个共享仓库分发到两端 |
| 流程层 | 同一条 6 阶段创作流水线（阶段名、提示词、产出物一致） |
| 人设层 | 同一份人设五维档案格式，两端互相导入导出 |
| 术语层 | 素材 / 选题 / 策略 / 成稿 / 去AI味 / 配图 / 排版 — 两端 UI 文案统一 |
| 商业层 | **不统一**：lingxi 付费托管（赚 token 差价），InkNest 免费本地（BYO-key） |

### 3.2 架构：共享技能仓库（唯一事实源）

```
creator-skills/  (新建 git 仓库，建议 ~/Dev/creator-skills)
├── skills/
│   ├── find-topic/SKILL.md          # v2
│   ├── chinese-viral-writer/SKILL.md # v2
│   ├── content-evaluation/SKILL.md   # v2
│   ├── humanizer-zh/SKILL.md         # v2
│   ├── fact-check/SKILL.md           # 原样收编
│   ├── cover-title/SKILL.md          # 原样收编
│   ├── baoyu-article-illustrator/SKILL.md
│   ├── baoyu-cover-image/SKILL.md
│   ├── script-writer/SKILL.md        # 新
│   ├── persona-builder/SKILL.md      # 新
│   └── content-feedback/SKILL.md     # 新
├── pipeline/                         # 6 阶段流水线提示词（从 lingxi pipeline-phases.ts 抽出）
│   ├── phase-0-topic.md
│   ├── phase-1-strategy.md
│   └── ...
└── scripts/
    ├── sync-lingxi.sh    # 复制到 lingxi/public/builtin-skills/
    ├── sync-inknest.sh   # 复制到 claude-desk/resources/builtin-skills/
    └── sync-personal.sh  # 复制到 ~/.claude/skills/
```

- 两端格式已兼容，同一份 SKILL.md 无需任何转换。
- 流水线提示词也进仓库：lingxi 从 `pipeline-phases.ts` 改为构建时读取；InkNest 新的引导流水线直接消费同一份。
- 改技能只改一处，跑三个 sync 脚本（或 CI 自动化）。

### 3.3 统一创作流水线在两端的落地

统一后的用户流程（两端一致）：

```
人设配置（一次性）→ 选题（供需扫描+推荐）→ 策略 Brief（4D + 人设维度标注）
→ 写作（长文 or 短视频脚本分支）→ 审稿循环（8 维评分）→ 去AI味
→ 配图 → 多平台排版 → 发布 → 数据复盘（反馈到下一轮选题）
```

| 阶段 | lingxi（已有/改动） | InkNest（需新增/复用） |
|---|---|---|
| 人设配置 | 已有品牌管理 → 字段升级为人设五维 | **新增**：设置里加"人设"页（本地存储） |
| 选题 | Phase 0 已有 → 换 find-topic v2 | 选题库已有 → 加"AI 推荐选题"按钮走同一 skill |
| 策略 | Phase 1 已有 → Brief 加人设维度字段 | **新增**：引导式流水线视图的一步 |
| 写作 | Phase 2 已有 → 加内容形态分支（长文/脚本） | 对话创作已有 → 流水线模式下自动带 Brief 上下文 |
| 审稿 | 自动评估循环已有 → 换 content-eval v2 | **新增**：流水线内自动跑，或改写工坊里手动触发 |
| 去AI味 | Phase 3 已有 → 换 humanizer-zh v2 | 改写工坊已有"去AI味"→ 换同一 skill |
| 配图 | Phase 4 已有（托管 Gemini，计费） | 已有图片能力 → 用户自己的 key 出图 |
| 排版 | Phase 5 已有 6 平台 | 改写工坊已有 8 平台 → **平台清单两端对齐** |
| 数据复盘 | **新增**：文章详情页加"粘贴数据复盘"入口 | **新增**：发布数据视图接 content-feedback |

InkNest 侧最大的新增件是**「引导式流水线」视图**：现在 InkNest 的各环节（素材/选题/对话/改写）是自由工具箱，小白不知道先用哪个。做一个和 lingxi 相同的分步向导（进度条 + 每步一个动作），底层复用现有对话引擎和共享流水线提示词。自由模式保留给进阶用户——这正好是"小白引导 + 极客自由"的双层结构。

### 3.4 InkNest 需要补的三块（对齐 lingxi 体验）

1. **内置技能**：当前 InkNest 不预装任何技能（依赖用户 `~/.claude/skills`，对小白是黑魔法）。改为：安装包内置 `resources/builtin-skills/`（来自共享仓库），首次启动 seed 进 SQLite 并默认启用。扫描 `~/.claude/skills` 的机制保留，作为"高级：使用本机 Claude Code 技能"。
2. **人设配置**：新增本地人设五维档案（settings 或独立表），注入逻辑与现有 `buildSkillsSystemPrompt` / `buildMaterialsSystemPrompt` 并列，加一个 `buildPersonaSystemPrompt`。支持导出 JSON —— 与 lingxi 品牌配置互认（用户从线上迁到本地或反向，人设带着走）。
3. **引导式流水线视图**：见 §3.3。新手引导第 2 步（创作流水线）直接指向它。

### 3.5 lingxi 需要改的三块

1. **内置技能替换为共享仓库版本**（8 → 11 个），`ensureBuiltinSkills` 的 `BUILTIN_SKILLS` 常量更新。
2. **品牌配置升级为人设五维**：`lingxi_brands` 加字段（五维素材点 + 内容日历配比），品牌管理 UI 改为引导式问答（直接复用 persona-builder skill 的对话流）。
3. **写作阶段加内容形态分支**：Phase 2 开始前问一次"这次产出什么"——长文（现有 chinese-viral-writer 路径）或短视频脚本（新 script-writer 路径）。脚本产物跳过配图/排版，直接给拍摄清单（口播稿 + 分镜提示）。

### 3.6 双端差异化边界（刻意不统一的部分）

| | lingxi（线上付费） | InkNest（本地免费） |
|---|---|---|
| 目标人群 | 纯小白：不想配任何东西 | 有 AI 账户的进阶创作者 / 重隐私者 |
| AI 供给 | 托管模型，按量计费（token 差价是商业模式） | BYO-key，多供应商 |
| 数据 | 云端（Supabase），跨设备 | 本地 SQLite + Obsidian vault，隐私 |
| 独有能力 | 微信登录/支付、零配置、白标潜力 | 素材库/知识图谱/分屏/编程 agent/浏览器自动化/离线语音 |
| 互相导流 | 页脚"想要免费本地版 + 用自己的 AI 账户 → 下载 InkNest" | 引导页"不想配 API key → 用线上版 lingxi，注册送 5 元" |

导流是双向漏斗：lingxi 接住零门槛用户，重度用户毕业到 InkNest（省 token 费）；InkNest 用户遇到"不想配 key"的朋友推荐 lingxi。两端体验一致，迁移无学习成本——这正是统一的商业意义。

---

## 4. 实施路线图（窄切片，每期独立可验收）

### Phase 1 — 共享技能仓库 + 个人 skills 更新（先做，1-2 天）
1. 建 `~/Dev/creator-skills` 仓库，收编 lingxi 现有 8 技能。
2. 写 4 个 v2 升级（find-topic / chinese-viral-writer / content-evaluation / humanizer-zh）。
3. 写 3 个新技能（script-writer / persona-builder / content-feedback），素材直接引用詹有才库的方法论提炼与脚本模板（内化表述）。
4. `sync-personal.sh` 同步到 `~/.claude/skills/` → **你的个人写作技能即刻可用**（用户需求 #1 完成）。
5. 验收：在 Claude Code 里各跑一次新技能，用真实选题出一条脚本。

### Phase 2 — lingxi 接入（2-3 天）
1. builtin-skills 替换 + `BUILTIN_SKILLS` 常量更新。
2. 流水线提示词抽到共享仓库，构建时注入。
3. 品牌 → 人设五维升级（DB migration + UI）。
4. Phase 2 内容形态分支（长文/脚本）。
5. 验收：线上完整跑一次"人设→选题→脚本→复盘"。

### Phase 3 — InkNest 补齐（3-5 天，本仓库）
1. 内置技能打包 + 首启 seed + 默认启用。
2. 人设配置（表 + 设置 UI + `buildPersonaSystemPrompt` + 导入导出 JSON）。
3. 引导式流水线视图（复用对话引擎 + 共享阶段提示词）。
4. 平台清单与 lingxi 对齐。
5. 验收：`npm run typecheck && npm test && npm run build` 全绿 + CDP 真机走一遍流水线。

### Phase 4 — 数据反馈闭环（1-2 天，MVP 手动粘贴）
1. 两端各加"数据复盘"入口，接 content-feedback skill。
2. 复盘产出的「本周创作参数」自动注入后续会话系统提示。
3. 后续演进：平台 API 自动拉数（抖音/公众号），对标库比对。

---

## 5. 需要你拍板的决策点

1. **共享仓库名与位置**：建议 `~/Dev/creator-skills`（独立 git 仓库，两产品共用）。也可以放进 lingxi monorepo，但会让 InkNest 依赖 lingxi 仓库，不建议。
2. **script-writer 形态**：一个技能带三模式（建议，选择成本低）vs 三个独立技能。
3. **lingxi 是否本期就加短视频脚本分支**：李同学框架是短视频导向，lingxi 当前用户是图文导向——可以 Phase 2 先只上选题/人设/审稿升级，脚本分支放 Phase 2.5 观察需求。
4. **InkNest 内置技能默认启用哪些**：建议默认启用 7 个核心（选题/写作/脚本/审稿/去AI味/人设/复盘），配图类默认关闭（依赖用户配图片模型 key）。
5. **数据复盘 MVP 用手动粘贴数据**是否可接受（平台 API 自动化放后期）。

---

## 附：调研来源

- lingxi：`~/Dev/lingxi/PRD.md`、`src/lib/skills/registry.ts`、`src/lib/pipeline.ts`、`src/lib/prompts/pipeline-phases.ts`、`public/builtin-skills/*/SKILL.md`
- 李同学框架：`~/Dev/詹有才/01-原始素材区/学习-短视频创作/{_方法论提炼,_脚本模板}.md`、`02-内容单元库/`（30+ 单元）、`01-原始素材区/对标-李同学抖音/`（100 条视频数据）、`_1on1诊断提炼.md`
- InkNest：`docs/DESIGN.md`、`CHANGELOG.md`、`src/main/db/skills.ts`、`src/main/agent/installed-skills.ts`、`src/main/agent/platform-presets.ts`
