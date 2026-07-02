# 双端统一设计规范 · lingxi（线上）× InkNest（桌面）

> 2026-07-02 · 基于双端 UI/UX 深度调研 + 三项已拍板决策
> 配套文档：`2026-07-02-writing-skills-lingxi-inknest-unification.md`（功能与技能层方案）

---

## 0. 已锁定的决策

| 决策 | 结论 | 影响 |
|---|---|---|
| 主品牌色 | **冷靛紫 #6d5dfb**（亮）/ #8174ff（暗），以 InkNest 为锚 | InkNest 零改动；lingxi 全站换色并顺势实装暗色模式 |
| 品牌命名 | **统一品牌「灵犀」+ 版本后缀**（已终确认） | 线上版 = 灵犀（主站），桌面版 = 灵犀桌面版（InkNest/墨栖名退役，claude-desk 后续更名） |
| 流水线粒度 | **7 阶段分组 + 可展开细步** | lingxi 13 步 StepRail 归组；InkNest 新建同构的流水线工作台 |

统一原则（承接功能方案）：**一套技能、一条流水线、一种语言、一套设计 tokens；差异只留在部署与付费层。**

---

## 1. 统一设计 Tokens

唯一事实源：`~/Dev/creator-skills/design/tokens.css`（新增目录，与技能同仓分发；两端各自消费——InkNest 现有 main.css 即基准，lingxi 替换其 tokens.css）。

### 1.1 色彩（以 InkNest 现有 tokens 为准，全量沿用）

```css
:root {
  --background: #fcfcff;   --foreground: #1c1c28;
  --card: #ffffff;         --card-foreground: #1c1c28;
  --primary: #6d5dfb;      --primary-foreground: #ffffff;
  --primary-soft: #eeebff;
  --secondary: #f1f1f8;    --muted: #f5f5fb;    --muted-foreground: #6a6a7d;
  --accent: #ecebfa;       --accent-foreground: #4a3fd0;
  --destructive: #e05570;
  --border: #e7e7f1;       --border-soft: #f0f0f7;
  --input: #e3e3ef;        --ring: #6d5dfb;
  --sidebar: #f4f3fb;
}
.dark {
  --background: #15151e;   --foreground: #ececf3;
  --card: #1e1e2a;
  --primary: #8174ff;      --primary-foreground: #15151e;
  --primary-soft: #272448;
  --secondary: #26263460;  --muted: #20202c;    --muted-foreground: #9a9ab0;
  --accent: #2c2c40;       --accent-foreground: #c4bcff;
  --destructive: #f0607e;
  --border: #2f2f40;       --border-soft: #26262f;
  --input: #2f2f40;        --ring: #8174ff;
  --sidebar: #1a1a25;
}
```

语义色补充（图谱/状态用，两端一致）：atom `#a06dfb`、topic/warning `#f59e0b`、success `#10b981`、info `#6B8B94`。

### 1.2 字体与排版（合并两端优点）

- 字体族：系统栈 + PingFang SC / Microsoft YaHei；等宽 SF Mono / JetBrains Mono。
- **基准字号分端**：桌面端 14px（信息密度优先，InkNest 现状）；网页端 16px（可读性 + 移动端防缩放，lingxi 现状）。比例尺共享（xs→2xl 同一比率）。
- **行高沿用 lingxi 的中文优化**：标题 1.1 / 副标题 1.25 / 正文 1.5 / 长文 1.625（`--leading-body`，改写预览、成稿阅读区必用）。
- 字距：大标题 -0.04em、正标题 -0.03em、标签 +0.05em（lingxi 现有 tracking 体系）。

### 1.3 空间、圆角、阴影、动效

- 间距：4px 网格（两端已一致）。
- 圆角：统一 `--radius: 0.85rem`（InkNest 现值；lingxi 从 0.75rem 迁移，一个变量改动）。
- 阴影：采用 lingxi 的 `--shadow-card` 四层微阴影体系（更精致），InkNest 引入。
- 动效：采用 lingxi 的 easing/duration tokens（`--ease-standard: cubic-bezier(0.6,0,0.2,1)`，instant 100 / fast 150 / normal 250 / slow 400ms）+ 消息淡入、思考点脉冲两个关键动画双端同款。

### 1.4 图标与组件

- 图标：lucide-react，strokeWidth 1.5（大图标）/1.75（小图标），`currentColor` 跟随主题。**禁 emoji 当图标**（InkNest 项目规则升级为双端规则）。
- 组件：shadcn 风格基础组件（Button/Input/Card/Dialog/Sheet/Dropdown/Tooltip）双端各自实现但 variant 命名与视觉一致；Button variants 以 InkNest 定义为准（default/secondary/ghost/outline/destructive）。

---

## 2. 统一术语与信息架构

### 2.1 术语表（两端 UI 文案强制一致）

| 统一术语 | lingxi 现状（改名） | InkNest 现状（改名） |
|---|---|---|
| **创作**（项目列表+流水线） | 文章项目 → 创作 | 新增视图 |
| **流水线工作台** | WorkspaceShell（保留，归组 7 阶段） | 新增（同构） |
| **成稿库** | 我的内容 → 成稿库 | 发布数据视图并入/关联 |
| **人设**（五维档案） | 品牌人设 → 人设 | 新增 |
| **素材库** | （P2 新增，可后置） | 现有 |
| **选题库** | （并入流水线选题阶段） | 现有 |
| **技能** | 技能（不变） | 技能（不变） |
| **复盘** | 新增入口 | 发布数据视图内新增 |
| 阶段名 | 选题 · 策略 · 写作 · 去AI味 · 配图 · 排版 · 复盘 | 同左 |

### 2.2 导航结构

**共享主轴**（两端顺序一致）：创作 → 成稿库 → 人设 → 技能 → 设置。

- **lingxi**：左侧栏 248px 保持，导航项按共享主轴重排；余额卡、充值入口保留（付费层）。
- **InkNest**：侧栏 232px 保持。「创作」置顶为主 CTA 区（流水线工作台入口 + 新建对话并列）；现有「创作」分组更名为「资产」（知识库/素材库/原子/标签/图谱/选题库/改写/发布）；「更多」分组不变（桌面专属工具）。

### 2.3 统一创作流水线（7 阶段，UI 同构）

```
① 选题（find-topic：供需扫描→推荐→确认）
② 策略（4D Brief + 人设维度标注；内容形态分支：长文 / 短视频脚本）
③ 写作（长文：chinese-viral-writer ▸ 初稿→8维审稿→自动修订；
        脚本：script-writer ▸ 三模式→开头三候选→质检）
④ 去AI味（humanizer-zh，audit→改写）
⑤ 配图（插图 + 封面；脚本形态跳过，改出拍摄清单）
⑥ 排版（多平台版本，平台清单两端对齐：小红书/公众号/抖音/视频号/知乎/B站/头条/X/LinkedIn/Substack 按需勾选）
⑦ 复盘（content-feedback：发布后回填数据→创作参数）
```

**StepRail 规范**（双端同一组件规格）：
- 主轨只显示 7 阶段：完成（绿勾）/ 进行中（紫脉冲）/ 待处理（灰）/ 错误（红）。
- 阶段行可展开显示内部细步（lingxi 原 13 步映射进各阶段；展开态记忆用户偏好）。
- 每阶段显示成本预估（lingxi 显示 ¥，InkNest 显示预计 tokens——同一 UI 位置，不同单位）。
- 已完成阶段可回溯，回溯修改后下游阶段标记「需重跑」脏态（解决 lingxi 现有脏态不明的断点）。
- 阶段级错误給「重试 / 修改输入 / 跳过」三个恢复动作（解决 lingxi 错误恢复不明的断点）。

**人设前置**：新建创作时若无人设档案，第一步引导创建（可跳过，选「无人设模式」）。

---

## 3. 界面级对齐矩阵

| 界面 | 对齐策略 | lingxi 动作 | InkNest 动作 |
|---|---|---|---|
| 流水线工作台 | **同构**（核心） | 13 步归组 7 阶段；换色 | 新建视图（StepRail + StepScreen，底层复用对话引擎） |
| 新建创作向导 | **同构** | 现有 5 字段表单换术语/换色 | 新建（同字段：人设/话题/形态/长度/平台） |
| 人设管理 | **同构**（表单 = persona-builder 五维问答） | 品牌表单重构为五维 | 新建视图 |
| 成稿库 | **同构**（列表 + 平台版本 + 导出） | 换名换色 | 关联发布数据 |
| 技能管理 | **同构**（列表 + 启用/禁用 + 导入） | 换色 | 现有 SkillsView 微调对齐 |
| 对话/流式输出 | **规范级一致**（气泡、思考折叠、逐字渲染） | 对齐样式 | 现状即基准 |
| 空状态 | **规范级一致**（图标 + 一句话 + CTA 按钮） | 现有模式保留 | 现有 Empty 组件加 CTA |
| 新手引导 | **首篇创作路径一致**：欢迎 →（可选）人设 → 第一篇 | 3 步 WelcomeDialog 保留 | 5 步 Tour 第 2 步改为指向流水线工作台，并加「开始第一篇」CTA |
| 设置 | 分端实现，分组语言一致 | 账户/计费为主 | API/模型/快捷键为主 |

**刻意不对齐（平台专属）**：
- lingxi 专属：落地页、定价、登录（验证码/微信）、充值与余额、消费明细、移动端响应式。
- InkNest 专属：分屏窗格、快捷键体系（⌘K/⌘⇧I/⌘D）、知识库 vault 双向同步、知识图谱、每日笔记/回顾/纪要、定时任务、浏览器自动化、编程视图、离线语音。
- **双向导流**：lingxi 设置页/落地页尾部 →「下载桌面版：免费 + 本地隐私 + 用自己的 AI 账户」；InkNest 引导与设置 →「不想配 API key？用云版，注册即用」。

---

## 4. 实施路线（窄切片）

### Phase 2A — lingxi 重设计（先行，改动集中端）
1. **T1 tokens 换色 + 暗色实装**：替换 tokens.css 为统一 tokens；全站 `--accent(#FB631B)` 引用改 `--primary`；补 `.dark` 支持 + 主题切换开关。落地页同步换色。
2. **T2 术语与 IA**：路由文案改名（文章项目→创作 / 我的内容→成稿库 / 品牌人设→人设）；侧栏按共享主轴重排。
3. **T3 StepRail 7 阶段归组**：13 步映射进 7 阶段，展开/脏态/错误恢复三件套。
4. **T4 人设五维**：brands 表加字段 + 表单重构为 persona-builder 问答流。
5. **T5 技能与脚本分支**：`sync-lingxi.sh` + BUILTIN_SKILLS 8→11；策略阶段加长文/脚本形态分支；复盘入口。
6. **T6 品牌名切换**：待品牌名最终确认后统一替换（落地页/标题/邮件域）。
每片跑 lint + build + e2e 冒烟。

### Phase 2B — InkNest 补齐（本仓库，即原 Phase 3）
1. **T1 内置技能**：`resources/builtin-skills/` 打包 + 首启 seed 默认启用 7 核心（配图 2 个默认关）。
2. **T2 人设视图**：本地表 + 五维表单 + `buildPersonaSystemPrompt` + JSON 导入导出（与云版互认）。
3. **T3 流水线工作台**：新视图（StepRail 7 阶段 + StepScreen），底层复用 run.ts 对话引擎 + 共享阶段提示词（creator-skills/pipeline/）。
4. **T4 术语对齐 + 导流入口 + 引导更新**。
每片跑 `npm run typecheck && npm test && npm run build` + CDP 真机验证。

### Phase 2C — 共享资产落库
- `creator-skills/design/tokens.css` + `pipeline/phase-*.md`（7 阶段提示词，从 lingxi pipeline-phases.ts 抽取重组）+ sync 脚本扩展。

---

## 5. 遗留决策（低优先级，不阻塞开工）

1. ~~品牌名终稿~~ 已定：**灵犀**为主品牌；桌面版更名「灵犀桌面版」（claude-desk 的 productName/图标/引导文案在 2B-T4 一并处理）。
2. lingxi 是否加轻量素材库（P2，看云存储成本与用户反馈）。
3. InkNest 成稿库是否从「发布数据」独立成视图（P2）。
