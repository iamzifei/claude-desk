---
name: find-topic
slug: find-topic
description: 爆款选题调研，先做供需扫描（三类选题方程判定 + 对标空位定位），再结合多学科理论框架系统分析各平台热门内容，生成高传播潜力的选题方向，支持供需评分与 12+ 种心理钩子类型。
keywords: [选题, 爆款选题, 供需关系, 供需扫描, 空位定位, 对标账号, 热点, 差异化, 心理钩子, 理论框架, viral topic, topic research]
allowed-tools: WebSearch, WebFetch, Read, Write, Glob, Grep
user-invocable: true
---

# 选题调研 Skill v2.1：供需扫描 × 多学科方法论版

> 供需关系判定 + 空位定位 + Dan Koe 爆款方法论 + 哲学/心理学/传播学/社会学理论武器库的系统化选题研究工具

---

## Skill 元数据

| 字段 | 值 |
|-----|---|
| **名称** | find-topic |
| **版本** | v2.1 |
| **触发方式** | `/find-topic` 或 `/选题` |
| **输出目录** | `/outputs/` |
| **理论武器库** | See "Reference: Theory Arsenal" section below |

---

## 核心方法论升级

### 第零层：供需关系判定（v2.1 NEW）

一切选题分析之前，先回答一个更根本的问题：**这个题有没有需求？**

```
核心公式：高需求 + 低供给 = 大流量
```

- 内容有没有大流量，首先由**供需关系**决定，而不是由文笔、钩子或结构决定。
- **选题那一刻，已经决定了这条内容的流量上限**——后面的钩子、结构、金句只能决定你在这个上限内拿到多少。
- 因此本 skill v2.1 在爆款采集之前新增「Phase 0.5: 供需扫描与空位定位」，先判定选题方程类型、再找赛道空位，避免把精力浪费在"无需求"的题上。

**与理论钩子体系的关系（互补，不替代）**：

| 层次 | 回答的问题 | 决定什么 |
|------|-----------|---------|
| **供需扫描（第零层）** | 这个题有没有人要看？ | 有没有流量（流量上限） |
| **理论钩子（第二层）** | 怎么让人停下来看？ | 能不能抓住（上限内的转化） |

供需决定"有没有流量"，钩子决定"能不能抓住"。两者缺一不可：供需好但钩子弱 = 浪费了好题；钩子强但供需差 = 精致地做了一条没人看的内容。现有哲学/心理/传播/社会四维理论武器库完整保留，在供需扫描通过后全量应用。

### 第一层：Dan Koe 实战方法论

1. **验证优先**：分析已验证的爆款，而非凭空想象
2. **三角验证**：深度分析 3-5 条爆款找共性模式
3. **结构与主题分离**：抄结构换主题，抄观点换结构
4. **系统化创作**：框架驱动而非灵感驱动

### 第二层：多学科理论武器库（NEW）

```
┌─────────────────────────────────────────────────────────────┐
│                    VIRAL 内容生成模型                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────┐   ┌───────────┐   ┌───────────┐            │
│   │  哲学层   │   │  心理学层  │   │  传播学层  │            │
│   │ 存在张力  │ + │  情绪触发  │ + │  注意力捕获 │            │
│   │ 意义建构  │   │  原型激活  │   │  框架效应  │            │
│   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘            │
│         │               │               │                   │
│         └───────────────┼───────────────┘                   │
│                         ▼                                   │
│               ┌─────────────────┐                          │
│               │    社会学层     │                          │
│               │  身份认同共鸣   │                          │
│               │  社会比较动力   │                          │
│               └─────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 理论武器库概览

| 学科 | 核心理论 | 内容功能 | 代表人物 |
|------|---------|---------|---------|
| **哲学** | 现象学、存在主义、权力意志 | 创造存在张力、意义深度 | 胡塞尔、海德格尔、尼采、福柯 |
| **心理学** | 集体无意识、原型理论、认知偏误 | 触发情绪、激活原型 | 荣格、卡尼曼、马斯洛 |
| **传播学** | 框架理论、注意力经济、叙事传输 | 捕获注意力、增强说服 | AIDA 模型、框架效应 |
| **社会学** | 社会认同、社会比较、符号互动 | 激活身份、引发共鸣 | 塔吉费尔、费斯汀格 |

---

## 执行流程

### Phase 0: 初始化

**输入收集**：

1. **关键词**（可选）
   - 如用户未提供，直接跳到 Phase 1
   - 如用户提供多个关键词，用逗号分隔

2. **品牌/人设**（自动）
   - 如系统提示中包含「当前品牌人设」部分，品牌已由用户选定，自动应用
   - 如系统提示中没有品牌信息，说明用户未配置品牌，基于素材本身的目标人群进行判断。不要询问用户选择品牌

3. **目标平台**（可选）
   - 小红书
   - 抖音
   - X（Twitter）
   - 微信公众号
   - 知乎
   - 全平台（默认）

4. **理论侧重**（可选，NEW）
   - 哲学深度优先（适合深度思考类内容）
   - 心理触发优先（适合情感共鸣类内容）
   - 社会话题优先（适合热点讨论类内容）
   - 全面均衡（默认）

**询问模板**：

```
开始选题调研。请确认以下信息：

1. 关键词：[用户输入 / 无（将直接搜索热门内容）]
2. 人设文件：[检测到的人设 / 无（将基于素材判断）]
3. 目标平台：[用户选择 / 全平台]
4. 理论侧重：[用户选择 / 全面均衡]

确认无误后，我将开始搜索热门内容并应用多学科理论分析。
```

---

### Phase 0.5: 供需扫描与空位定位（v2.1 NEW）

> 在采集爆款之前先做两件事：① 判定选题属于哪类供需方程；② 扫描赛道对标账号，找差异化空位。
> 原则：**选题那一刻已决定流量上限**——先确认"有没有需求"，再谈"怎么写"。

#### Step 1: 选题三类方程判定

对用户给出的关键词/方向（或候选选题），逐一判定属于哪类方程：

| 方程类型 | 供需特征 | 判定后动作 |
|---------|---------|-----------|
| **热点/事件类** | 高需求——事件本身自带海量搜索与讨论 | **时效窗口极短，越早越好**。提醒用户：热点内容发得越早流量越大，越往后跟进的人越多、供给激增，流量急剧衰减。若热点已过峰值，建议换角度（如复盘/延伸观点）或放弃 |
| **产品介绍类** | **无需求 = 无流量**——没有人主动想看"介绍我的产品/服务有多好" | **直接预警用户**：此类选题不可能有自然流量，建议换角度——把"介绍产品"转换成"解决用户问题"（用户真实需求类）或"借热点带产品"（热点类），让产品成为答案而非主角 |
| **用户真实需求类** | 需求真实存在但强度未知 | **需调研验证**：通过 Phase 1 的爆款采集验证——同题材是否已有验证过的爆款（需求存在的证据）、供给是否已经饱和（同质内容数量） |

**判定输出格式**：

```markdown
## 供需扫描结果

| 候选方向 | 方程类型 | 需求强度 | 供给饱和度 | 供需结论 |
|---------|---------|---------|-----------|---------|
| [方向 1] | [热点/产品介绍/真实需求] | [高/中/低] | [高/中/低] | [大流量机会 / 需抢时效 / 预警：换角度 / 需验证] |
```

**硬性规则**：
- 产品介绍类 → 必须显式预警"无需求 = 无流量"，并给出 2-3 个换角度建议，不允许静默放行。
- 热点类 → 必须标注时效窗口判断（还在窗口内 / 已过峰值）。
- 真实需求类 → 标注"待 Phase 1 验证"，并在 Phase 1 采集时重点验证需求与供给。

#### Step 2: 空位定位（对标账号扫描）

用 WebSearch 搜索该赛道/关键词下的 3-5 个头部或代表性对标账号，列出各自的**形态**：

```markdown
## 赛道对标扫描

| # | 账号形态描述 | 领域 | 内容形式 | 身份标签 |
|---|-------------|------|---------|---------|
| 1 | [描述] | [垂类] | [口播/图文/剧情/教程...] | [TA 以什么身份说话] |
| ... | | | | |

### 空位分析

- 被占满的位置：[大家都在做的领域 × 形式 × 身份组合]
- 空位候选：
  1. [更细分的身份标签]：[说明]
  2. [没人用的内容形式]：[说明]
  3. [没人切的细分人群]：[说明]
```

**空位定位原则**：

- 核心思路是**做得不一样，而非做得更好**——和头部拼"更好"是内卷，找没人占的位置才是定位。
- 两个主要空位方向：
  1. **更细分的身份**：在宽泛赛道里切出一个具体身份标签。例如某垂直行业从业者不做泛行业科普，而是切"专门服务某细分人群的从业者"这一更窄身份，小体量粉丝也能成为该细分位置的头部。
  2. **没人用的形态**：同领域内容大家都用 A 形式，你用 B 形式（如都发图文你做口播、都讲干货你讲故事），形成形式差异。
- 判据：这个位置上**竞争程度大不大**——不大就值得占。
- 空位结论将直接喂给 Phase 3 的选题生成（选题角度向空位倾斜）和 Phase 4 的供需评分。

#### Step 3: 扫描小结

输出一段 3-5 行的供需小结，明确：本次调研主攻哪类方程、建议占据什么空位、哪些方向被预警剔除。之后进入 Phase 1。

---

### Phase 1: 爆款采集

**搜索策略**：

根据目标平台，使用 WebSearch 工具搜索热门内容。

#### 小红书

```
搜索词模板：
- "{关键词} 小红书 爆款 点赞过万"
- "{关键词} 小红书 热门笔记 2026"
- "site:xiaohongshu.com {关键词}"
```

筛选条件：
- 点赞 > 1 万
- 发布时间 < 30 天
- 内容类型：图文/视频均可

#### 抖音

```
搜索词模板：
- "{关键词} 抖音 热门 百万播放"
- "{关键词} 抖音 爆款视频 2026"
```

筛选条件：
- 点赞 > 10 万
- 发布时间 < 30 天

#### X（Twitter）

```
搜索词模板：
- "{关键词} viral tweet"
- "{关键词} twitter thread popular"
- "site:x.com {关键词} 1000+ likes"
```

筛选条件：
- 互动（点赞+转发+评论）> 1000
- 发布时间 < 30 天

#### 微信公众号

```
搜索词模板：
- "{关键词} 微信公众号 10万+"
- "{关键词} 微信文章 爆款"
```

筛选条件：
- 阅读量 > 10 万
- 发布时间 < 30 天

#### 知乎

```
搜索词模板：
- "{关键词} 知乎 高赞回答"
- "site:zhihu.com {关键词} 赞同过千"
```

筛选条件：
- 赞同 > 1000
- 发布时间 < 90 天（知乎内容时效性较长）

**采集目标**：每个平台收集 5-10 条爆款内容

**输出格式**：

```markdown
## 爆款采集结果

### 小红书 TOP 5

| # | 标题 | 点赞 | 作者 | 链接 |
|---|------|------|------|------|
| 1 | [标题] | [数量] | [作者名] | [链接] |
| ... | ... | ... | ... | ... |

### 抖音 TOP 5

| # | 标题 | 点赞 | 作者 | 链接 |
|---|------|------|------|------|
| 1 | [标题] | [数量] | [作者名] | [链接] |
| ... | ... | ... | ... | ... |

### X TOP 5

| # | 标题/内容摘要 | 互动量 | 作者 | 链接 |
|---|---------------|--------|------|------|
| 1 | [摘要] | [数量] | [作者名] | [链接] |
| ... | ... | ... | ... | ... |
```

---

### Phase 2: 深度结构分析（多学科三角验证法）

**选取标准**：从 Phase 1 采集的内容中，选取表现最好的 3-5 条进行深度分析。

**分析维度**：

#### A. 基础钩子类型识别

识别每条爆款使用的钩子类型：

| 钩子类型 | 特征 | 示例 |
|---------|------|------|
| 痛点型 | 直击用户困扰 | "你还在为 xxx 发愁吗？" |
| 逆袭型 | 展示转变过程 | "从月薪 3k 到年入百万" |
| 反直觉型 | 颠覆常规认知 | "xxx 其实是错的" |
| 揭秘型 | 揭示隐藏真相 | "xxx 的真相是..." |
| 清单型 | 结构化干货 | "5 个方法让你 xxx" |
| 问题型 | 引发好奇心 | "为什么 xxx 却 xxx？" |
| 对比型 | 制造落差感 | "普通人 xxx，高手 xxx" |
| 预言型 | 趋势预测 | "2026 年 xxx 将会 xxx" |

#### B. 理论层分析（NEW）

**哲学维度分析**：

| 理论框架 | 分析问题 | 记录 |
|---------|---------|------|
| **海德格尔-存在张力** | 是否唤起时间紧迫感/向死而生意识？ | [是/否，具体表现] |
| **尼采-价值颠覆** | 是否重估/颠覆了某种传统价值？ | [是/否，具体表现] |
| **福柯-权力揭示** | 是否揭示了某种隐藏的权力/话语控制？ | [是/否，具体表现] |
| **胡塞尔-本质还原** | 是否帮助读者"悬置"成见，看到本质？ | [是/否，具体表现] |
| **斯多葛-控制二分** | 是否聚焦于可控之事，释放不可控焦虑？ | [是/否，具体表现] |

**心理学维度分析**：

| 理论框架 | 分析问题 | 记录 |
|---------|---------|------|
| **荣格-原型激活** | 激活了哪种原型？（英雄/导师/阴影/智者） | [原型类型] |
| **情绪触发器** | 核心情绪是什么？（恐惧/好奇/愤怒/希望/骄傲） | [情绪类型] |
| **认知偏误利用** | 利用了哪种偏误？（损失厌恶/社会证明/稀缺性） | [偏误类型] |
| **需求层次** | 触达了马斯洛哪个层次？ | [层次] |

**传播学维度分析**：

| 理论框架 | 分析问题 | 记录 |
|---------|---------|------|
| **框架效应** | 使用的是得益框架还是损失框架？ | [框架类型] |
| **张力类型** | 创造了什么类型的张力？（认知/情感/信息/社会/时间） | [张力类型] |
| **注意力捕获** | 使用了什么模式中断技巧？ | [技巧描述] |

**社会学维度分析**：

| 理论框架 | 分析问题 | 记录 |
|---------|---------|------|
| **身份认同** | 激活了什么群体身份？ | [身份标签] |
| **社会比较** | 引发了什么方向的比较？（向上/向下/平行） | [比较方向] |
| **文化资本** | 涉及哪种资本？（经济/文化/社会/符号） | [资本类型] |

#### C. 内容结构拆解

```
【标题结构】
- 字数：
- 关键词：
- 情感词：
- 数字使用：
- 理论公式应用：[识别使用的理论公式]

【开头钩子】(前 3 句)
- 钩子类型：
- 核心技巧：
- 理论基础：[背后的理论支撑]

【内容框架】
- 结构类型：[总分总 / 递进式 / 并列式 / 故事线]
- 段落数量：
- 信息密度：[高/中/低]
- 叙事传输：[故事元素分析]

【情感曲线】
- 开头情绪：
- 中间转折：
- 结尾情绪：
- 张力-释放节奏：

【行动号召】(CTA)
- 类型：[关注/收藏/评论/转发]
- 话术：
```

#### D. 成功因素提炼

```
【为什么爆】
1. 选题因素：
2. 结构因素：
3. 情感因素：
4. 时机因素：
5. 理论因素：[哪些理论框架起了关键作用]

【可复用元素】
- 标题公式：
- 开头模板：
- 结构框架：
- 理论组合：[可复用的理论组合模式]
```

**输出格式**：

```markdown
## 爆款结构分析

### 分析样本 1：[标题]

**基础信息**
- 平台：[小红书/抖音/X]
- 数据：点赞 xxx / 评论 xxx / 收藏 xxx
- 发布时间：

**钩子分析**
- 基础钩子类型：[类型名称]
- 钩子技巧：[具体分析]

**理论层分析**
| 维度 | 识别结果 | 分析 |
|------|---------|------|
| 哲学 | [理论] | [具体表现] |
| 心理 | [理论] | [具体表现] |
| 传播 | [理论] | [具体表现] |
| 社会 | [理论] | [具体表现] |

**结构拆解**
[按上述模板填写]

**成功因素**
[按上述模板填写]

---

### 分析样本 2：[标题]
[同上格式]

---

### 分析样本 3：[标题]
[同上格式]

---

## 结构模式总结

### 共性发现

1. **标题模式**：
2. **钩子偏好**：
3. **结构偏好**：
4. **情感基调**：
5. **理论组合模式**：[发现的有效理论组合]

### 可复用框架库

#### 框架 A：[命名]
```
[具体框架描述]
理论基础：[支撑理论]
```

#### 框架 B：[命名]
```
[具体框架描述]
理论基础：[支撑理论]
```

#### 框架 C：[命名]
```
[具体框架描述]
理论基础：[支撑理论]
```
```

---

### Phase 3: 选题生成（12+ 心理钩子 × 理论增强）

**生成原则**：

> "Most people don't have an idea problem, they have a structure problem. Any idea can go viral if and only if you structure it the right way." — Dan Koe

> "内容的深度来自理论，广度来自共鸣，力度来自张力。" — Theory Arsenal

**生成策略**：

每种钩子类型生成 2-3 个选题，共 24-36 个候选选题。每个选题需标注所应用的理论框架。

---

#### 基础钩子（8 类）+ 理论增强

##### 钩子类型 1：痛点型

```
公式：你还在 [痛点行为] 吗？/ [痛点现象] 的人都有这个问题
理论增强：
- 福柯视角：揭示痛点背后的系统性压迫
- 荣格视角：痛点可能是阴影的投射
- 损失厌恶：强调不改变会失去什么
```

生成示例：
- 基础版："你还在用 xxx 吗？难怪效率这么低"
- 福柯增强："你还在为效率焦虑吗？这是系统设计让你如此"
- 荣格增强："你讨厌的那个低效的自己，其实在保护你"

##### 钩子类型 2：逆袭型

```
公式：从 [低起点] 到 [高成就] / 我是如何 [实现转变] 的
理论增强：
- 尼采视角：自我超越与权力意志
- 英雄原型：经典的英雄之旅结构
- 社会比较：向上比较激发动力
```

生成示例：
- 基础版："从月薪 3000 到年入百万，我只做对了这一件事"
- 尼采增强："我如何从弱者变成不需要别人认可的人"
- 英雄原型："我的深渊时刻，以及后来发生的事"

##### 钩子类型 3：反直觉型

```
公式：[常规认知] 其实是错的 / 别再 [常规做法] 了
理论增强：
- 尼采视角：重估一切价值
- 胡塞尔视角：悬置成见，回到事物本身
- 维特根斯坦视角：语言塑造了错误认知
```

生成示例：
- 基础版："努力学习反而让你更焦虑"
- 尼采增强："'努力'是弱者发明的词，强者只会说'想要'"
- 胡塞尔增强："忘掉你学过的一切关于成功的定义"

##### 钩子类型 4：揭秘型

```
公式：xxx 的真相是... / 揭秘：xxx 背后的 [秘密/逻辑]
理论增强：
- 福柯视角：权力/知识的隐藏运作
- 信息不对称：知道 vs 不知道的鸿沟
- 阴影揭示：行业/社会不愿示人的一面
```

生成示例：
- 基础版："大厂裁员的真相：不是你不够努力"
- 福柯增强："为什么公司培训你'成长'——这不是为了你"
- 阴影揭示："光鲜职业背后没人说的阴暗面"

##### 钩子类型 5：清单型

```
公式：[数字] 个 [方法/技巧/原则] 让你 [达成目标]
理论增强：
- 认知减负：结构化降低理解成本
- 社会证明：验证过的方法列表
- 文化资本：提供可操作的知识
```

生成示例：
- 基础版："5 个习惯让你效率翻倍"
- 认知增强："只需记住这 3 件事，其他都是噪音"
- 文化资本："掌握这 5 个概念，你的认知超过 90% 的人"

##### 钩子类型 6：问题型

```
公式：为什么 [现象 A] 却 [现象 B]？/ [问题] 的答案可能出乎你意料
理论增强：
- 认知张力：问题创造信息空缺
- 悖论框架：看似矛盾激发好奇
- 苏格拉底式提问：引导自我反思
```

生成示例：
- 基础版："为什么你那么努力，还是赚不到钱？"
- 悖论增强："为什么最聪明的人往往赚不到钱？"
- 苏格拉底式："你真的想要你说你想要的东西吗？"

##### 钩子类型 7：对比型

```
公式：普通人 [做法 A]，高手 [做法 B] / [A 类人] vs [B 类人]
理论增强：
- 社会比较理论：向上比较的动力
- 身份认同：你想成为哪类人
- 二元对立：非此即彼的张力
```

生成示例：
- 基础版："普通人学英语背单词，高手这样做"
- 身份增强："打工人 vs 事业家：同样 996，结果为何天差地别"
- 二元对立："消费者思维 vs 创造者思维：你是哪种？"

##### 钩子类型 8：预言型

```
公式：[时间] 年，xxx 将会 [趋势] / 未来 [时间]，[预测]
理论增强：
- 海德格尔视角：向死而生的紧迫感
- 稀缺性原则：窗口期即将关闭
- 趋势权威：掌握未来信息的优越感
```

生成示例：
- 基础版："2026 年，这个行业将彻底消失"
- 海德格尔增强："如果你还有 5 年职业生涯，现在该做什么？"
- 稀缺性增强："2026 最后的上车机会，错过不再有"

---

#### 高级钩子（4 类）— 理论驱动型（NEW）

##### 钩子类型 9：存在觉醒型（海德格尔启发）

```
公式：
- "你有 [有限时间]，却在 [浪费方式]"
- "[死亡/终结] 之前，[必做之事]"
- "本真的 [生活/工作] 是什么样的"

核心理论：
- 向死而生：死亡意识催生本真生活
- 被抛状态：接受处境，创造意义
- 本真性 vs 常人：脱离"大家都这样"的束缚
```

生成示例：
- "你有 4000 周可活，已用掉了多少？"
- "40 岁前必须想清楚的 3 个问题"
- "停止假装忙碌：什么是真正重要的事"
- "你不是太忙，你是在逃避真正的人生"

##### 钩子类型 10：价值颠覆型（尼采启发）

```
公式：
- "[美德] 其实是 [弱点的伪装]"
- "重新定义 [核心概念]"
- "成为 [超越常人的状态]"

核心理论：
- 重估一切价值：质疑继承的信念
- 权力意志：成长和超越的本能
- 主人道德 vs 奴隶道德：创造价值 vs 接受价值
```

生成示例：
- "谦虚是另一种形式的傲慢"
- "别再追求'成功'了——追求这个"
- "如何成为不需要别人认可的人"
- "'工作生活平衡'是弱者的借口"

##### 钩子类型 11：权力觉察型（福柯启发）

```
公式：
- "为什么 [权威] 要你相信 [观点]"
- "[系统] 如何控制你的 [行为/思想]"
- "挣脱 [隐性规训]"

核心理论：
- 权力/知识：知识不是中性的
- 规训社会：我们如何被塑造
- 话语分析：语言如何限制可能性
```

生成示例：
- "为什么学校从不教你理财？"
- "你的焦虑是被设计出来的"
- "为什么'做自己'反而这么难？因为..."
- "职场 PUA 的 5 种隐蔽形式"

##### 钩子类型 12：原型激活型（荣格启发）

```
公式：
- "你内心的 [原型] 在召唤你"
- "与你的 [阴影] 和解"
- "你不是 [表面身份]，你是 [深层身份]"

核心理论：
- 原型：英雄、导师、阴影、智者、探索者
- 阴影整合：接纳被拒绝的自我部分
- 个体化：成为完整的自己
```

生成示例：
- "你心中的那个创业者，什么时候出发？"
- "那个你讨厌的自己，其实在保护你"
- "你不是社恐，你是在等待对的人"
- "中年危机的真相：你的灵魂在苏醒"

---

#### 理论组合公式（NEW）

| 组合名称 | 理论配方 | 适用场景 | 模板 |
|---------|---------|---------|------|
| **存在焦虑+解决方案** | 海德格尔 + 斯多葛 | 人生规划类 | "人生苦短，但你只需专注这一件事" |
| **价值颠覆+身份升级** | 尼采 + 社会认同 | 成长突破类 | "别当好员工了，成为好事业家" |
| **权力揭示+自我解放** | 福柯 + 荣格 | 职场/社会批判类 | "你的拖延症不是病，是反抗" |
| **原型激活+英雄之旅** | 荣格 + 叙事传输 | 励志故事类 | "每个人都是自己故事的英雄" |
| **损失恐惧+紧迫行动** | 损失厌恶 + 海德格尔 | 紧迫转化类 | "你每天都在失去这些机会" |
| **社会比较+身份跃迁** | 费斯汀格 + 尼采 | 竞争激励类 | "同龄人已经...而你还在..." |

---

**输出格式**：

```markdown
## 选题生成（共 36 个）

### 一、基础钩子类选题

#### 痛点型（3 个）
1. **[选题标题]**
   - 核心痛点：
   - 理论增强：[应用的理论]
   - 适用平台：

2. [同上格式]
3. [同上格式]

#### 逆袭型（3 个）
[同上格式]

[... 其他基础钩子类型 ...]

### 二、高级钩子类选题（理论驱动）

#### 存在觉醒型（3 个）
1. **[选题标题]**
   - 存在张力点：
   - 海德格尔要素：[向死而生/本真性/被抛状态]
   - 情绪曲线：焦虑 → 觉醒 → 行动
   - 适用平台：

2. [同上格式]
3. [同上格式]

#### 价值颠覆型（3 个）
1. **[选题标题]**
   - 颠覆的价值：
   - 尼采要素：[重估价值/权力意志/超人]
   - 争议程度：[高/中/低]
   - 适用平台：

2. [同上格式]
3. [同上格式]

#### 权力觉察型（3 个）
1. **[选题标题]**
   - 揭示的权力：
   - 福柯要素：[规训/话语/知识-权力]
   - 觉醒程度：[启发/警醒/觉悟]
   - 适用平台：

2. [同上格式]
3. [同上格式]

#### 原型激活型（3 个）
1. **[选题标题]**
   - 激活原型：[英雄/导师/阴影/智者/探索者]
   - 荣格要素：[原型/阴影/个体化]
   - 共鸣深度：[表层/中层/深层]
   - 适用平台：

2. [同上格式]
3. [同上格式]

### 三、理论组合选题（高阶）

#### 组合 1：存在焦虑+解决方案
1. **[选题标题]**
   - 理论配方：海德格尔 × 斯多葛
   - 张力构建：
   - 解决承诺：
   - VIRAL 评分：[V/I/R/A/L 各项得分]

[... 其他组合 ...]
```

---

### Phase 4: 智能筛选（升级版）

**评分维度**：

#### 维度 0：供需分（0-10 分）× 权重 20%（v2.1 NEW，权重最高之一）

基于 Phase 0.5 的供需扫描结果打分：

- 10 分：高需求 + 低供给（需求已被爆款验证，同题供给稀少，或占据明确空位）
- 7-9 分：需求明确，供给中等（有差异化角度可切）
- 4-6 分：需求存在但供给饱和（需靠空位/形式差异突围）
- 0-3 分：产品介绍类或伪需求（无需求 = 无流量，**原则上直接剔除**，除非用户明确坚持）

**与其他维度的关系**：供需分判断的是"选题方程"本身（这个题有没有人要看，决定流量上限），是**先决维度**；「差异化程度」判断的是供给侧的表达角度是否拥挤，「预估吸引力」判断的是钩子层面能否抓住人——两者都是在供需通过之后的上限内做优化。供需分 ≤ 3 的选题，其他维度分再高也不应进入 TOP 10。

#### 维度 1：人设匹配度（0-10 分）× 权重 15%

如有人设文件：
- 10 分：完全符合人设定位和调性
- 7-9 分：基本符合，略有偏差
- 4-6 分：部分符合
- 0-3 分：与人设冲突

如无人设文件：
- 基于素材本身的目标人群判断
- 评估选题是否能吸引该人群

#### 维度 2：素材可得性（0-10 分）× 权重 10%

- 10 分：有现成素材，可直接使用
- 7-9 分：素材容易获取或创作
- 4-6 分：需要一定准备工作
- 0-3 分：素材获取困难

#### 维度 3：差异化程度（0-10 分）× 权重 15%

- 10 分：市场上几乎没有同类内容
- 7-9 分：有独特角度或新观点
- 4-6 分：常见话题但有自己的切入点
- 0-3 分：同质化严重

#### 维度 4：预估吸引力（0-10 分）× 权重 15%

基于爆款分析结果评估：
- 10 分：极强爆款潜质
- 7-9 分：较高爆款可能
- 4-6 分：中等表现预期
- 0-3 分：可能表现平平

#### 维度 5：理论深度（0-10 分）× 权重 15%

- 10 分：多理论精妙融合，思想深度突出
- 7-9 分：理论应用得当，有深度增益
- 4-6 分：基础理论应用
- 0-3 分：无明显理论支撑

#### 维度 6：张力强度（0-10 分）× 权重 10%

- 10 分：强烈的认知/情感/社会张力
- 7-9 分：明显的张力感
- 4-6 分：有一定张力
- 0-3 分：张力不足

**综合评分公式（v2.1 升级版）**：

```
总分 = (供需分 × 0.20) + (人设匹配度 × 0.15) + (素材可得性 × 0.10) + (差异化程度 × 0.15)
     + (预估吸引力 × 0.15) + (理论深度 × 0.15) + (张力强度 × 0.10)

硬性门槛：供需分 ≤ 3（产品介绍类/伪需求）的选题直接剔除，不参与排名。
```

**VIRAL 快速评分（补充）**：

```
V (Validation/Violation) - 期望验证/违反程度：1-10
I (Identity) - 身份激活程度：1-10
R (Resonance) - 情感共鸣程度：1-10
A (Attention) - 注意力捕获力：1-10
L (Logic) - 逻辑可信度：1-10

VIRAL Score = (V×1.5 + I×1.2 + R×1.3 + A×1.5 + L×0.5) / 6
目标：≥ 7.5 具有高爆款潜力
```

**输出格式**：

```markdown
## 选题评分排名

| 排名 | 选题 | 供需分 | 钩子类型 | 理论配方 | 综合分 | VIRAL分 |
|------|------|--------|----------|----------|--------|---------|
| 1 | [标题] | 9（高需求低供给） | [类型] | [理论] | 8.5 | 8.2 |
| 2 | [标题] | 8（真实需求+空位） | [类型] | [理论] | 8.3 | 8.0 |
| ... | ... | ... | ... | ... | ... | ... |

---

## TOP 10 精选选题

### 1. [选题标题]

**选题信息**
- 供需判定：[方程类型 + 供需分，如：真实需求类，供需分 9（需求已验证、供给稀少）]
- 占位空位：[对应 Phase 0.5 的空位候选 / 无]
- 钩子类型：[类型]
- 理论配方：[理论组合]
- 综合评分：[分数]
- VIRAL 评分：V=[]/I=[]/R=[]/A=[]/L=[] → [总分]
- 推荐平台：[平台]

**理论解构**
- 哲学维度：[如何创造存在张力]
- 心理维度：[激活何种情绪/原型]
- 传播维度：[注意力捕获策略]
- 社会维度：[身份认同激活]

**推荐理由**
[为什么这个选题值得做，理论支撑是什么]

**参考结构**
[基于爆款分析的推荐结构]

**测试版标题**（用于验证）
- 版本 A（理论强化版）：[标题变体 1]
- 版本 B（通俗版）：[标题变体 2]
- 版本 C（争议版）：[标题变体 3]

**素材准备清单**
- [ ] [素材 1]
- [ ] [素材 2]
- [ ] [素材 3]

---

### 2. [选题标题]
[同上格式]

...

### 10. [选题标题]
[同上格式]
```

---

### Phase 5: 输出存档

**文件命名**：

```
选题调研_{关键词}_{YYYY-MM-DD}.md
```

如无关键词：

```
选题调研_热门趋势_{YYYY-MM-DD}.md
```

**文件结构**：

```markdown
# 选题调研报告

> 生成时间：YYYY-MM-DD HH:mm
> 关键词：[关键词 / 无]
> 人设文件：[文件名 / 无]
> 目标平台：[平台]
> 理论侧重：[哲学深度/心理触发/社会话题/全面均衡]
> 方法论版本：v2.1（供需扫描 × 多学科理论武器库版）

---

## 目录

1. [供需扫描与空位定位](#供需扫描结果)
2. [爆款采集结果](#爆款采集结果)
3. [深度结构分析](#深度结构分析)
4. [理论模式总结](#理论模式总结)
5. [选题生成](#选题生成)
6. [TOP 10 精选](#top-10-精选)
7. [理论应用指南](#理论应用指南)
8. [下一步行动](#下一步行动)

---

[Phase 0.5-4 的所有输出内容]

---

## 理论应用指南

### 本次调研发现的有效理论组合

| 组合 | 效果 | 适用场景 |
|------|------|---------|
| [组合1] | [效果描述] | [场景] |
| [组合2] | [效果描述] | [场景] |

### 该领域的理论使用建议

1. **推荐的哲学框架**：[具体建议]
2. **有效的心理触发**：[具体建议]
3. **社会共鸣点**：[具体建议]

---

## 下一步行动

### 立即可做

1. 选择 1-2 个选题进行内容创作
2. 使用「测试版标题」在目标平台发布测试
3. 观察 24-48 小时内的数据表现

### 验证策略

按 Dan Koe + 理论验证方法：
- 在 X/小红书发布简短版本测试
- A/B 测试不同理论强度的标题版本
- 如果互动率 > 平均值 2 倍，说明选题有潜力
- 表现好的选题扩展为长内容

### 素材准备

[列出 TOP 3 选题需要准备的素材]

### 深度内容建议

如选题表现优异，可扩展为：
- 深度长文（融入更多理论分析）
- 系列内容（每篇聚焦一个理论视角）
- 视频脚本（视觉化理论概念）
```

选题调研结果直接输出在对话中。

---

## 使用示例

### 示例 1：有关键词 + 有人设 + 理论侧重

```
用户：/find-topic AI 编程 --theory=philosophy

AI：检测到关键词「AI 编程」
    检测到当前品牌配置已通过系统提示注入。

    理论侧重：哲学深度优先（将重点应用海德格尔、尼采、福柯等框架）

AI：开始执行选题调研（多学科理论武器库版）...
    [执行 Phase 0.5 供需扫描 → Phase 1-5]
```

### 示例 2：无关键词 + 无人设（探索热门）

```
用户：/选题

AI：未检测到关键词，将直接搜索各平台热门内容。
    未指定人设，将基于素材本身的目标人群进行判断。
    理论侧重：全面均衡（默认）

    请确认目标平台：
    1. 小红书
    2. 抖音
    3. X
    4. 微信公众号
    5. 知乎
    6. 全平台（默认）

用户：1

AI：开始搜索小红书热门内容...
    [执行 Phase 1-5，应用多学科理论分析]
```

### 示例 3：快速模式 + 心理触发优先

```
用户：/find-topic 护肤 --platform=小红书 --theory=psychology

AI：快速模式启动
    关键词：护肤
    品牌：（使用系统提示中的品牌配置）
    平台：小红书
    理论侧重：心理触发优先（将重点应用荣格原型、情绪触发、认知偏误等）

    开始执行...
    [执行 Phase 0.5 供需扫描 → Phase 1-5]
```

---

## 配置选项

### 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--brand=<name>` | 指定品牌（由系统提示注入，用户无需手动指定） | 无 |
| `--platform=<name>` | 指定目标平台 | 全平台 |
| `--count=<n>` | 每类钩子生成数量 | 3 |
| `--top=<n>` | 精选数量 | 10 |
| `--theory=<type>` | 理论侧重（philosophy/psychology/social/balanced） | balanced |

### 环境变量

| 变量 | 说明 |
|------|------|
| *(品牌配置)* | 品牌信息由系统提示自动注入 |

---

## 注意事项

1. **搜索限制**：部分平台可能限制搜索，如遇问题请告知用户手动提供爆款链接

2. **供需优先**：供需扫描是所有分析的前置闸门——产品介绍类选题必须预警，不允许静默进入后续流程；热点类必须标注时效窗口

3. **人设优先**：如果选题与人设冲突，即使分数高也要降权或剔除

4. **时效性**：热门话题有时效性，建议 7 天内完成内容创作（热点/事件类窗口更短，以小时计）

5. **版权意识**：分析结构可以借鉴，内容必须原创

6. **测试验证**：鼓励用户先用简短版本测试，验证后再投入精力做长内容

7. **理论伦理**：使用理论武器库时注意：
   - 不要操纵，而是启发
   - 不要制造虚假焦虑
   - 深度内容需要真诚支撑

8. **平衡深度与传播**：理论深度与大众传播有时存在张力，需根据平台调整

---

## 理论武器库快速参考

### 哲学框架速查

| 理论家 | 核心概念 | 内容应用 | 钩子模板 |
|--------|---------|---------|---------|
| **胡塞尔** | 悬置、本质直观 | 回到事物本身 | "忘掉你知道的一切关于 X" |
| **海德格尔** | 向死而生、本真性 | 存在紧迫感 | "你有 Y 时间，在做什么？" |
| **尼采** | 重估价值、超人 | 颠覆信念 | "X 其实是弱者的发明" |
| **福柯** | 权力/知识、规训 | 揭示控制 | "为什么 X 要你相信 Y" |
| **列维纳斯** | 他者、责任 | 关系视角 | "你欠 X 一个回答" |
| **维特根斯坦** | 语言游戏 | 重新定义 | "'X'不是你以为的意思" |
| **斯多葛** | 控制二分、命运爱 | 聚焦可控 | "关于 X，唯一重要的是 Y" |

### 心理触发速查

| 触发器 | 强度 | 钩子模板 |
|--------|------|---------|
| **恐惧** | ★★★★★ | "你不知道的 X 危险" |
| **好奇** | ★★★★★ | "X 的真相是..." |
| **愤怒** | ★★★★☆ | "我们都被 X 骗了" |
| **希望** | ★★★★☆ | "X 还不晚" |
| **骄傲** | ★★★★☆ | "只有 1% 的人知道 X" |
| **归属** | ★★★☆☆ | "如果你是 X 类人..." |
| **惊讶** | ★★★★☆ | "X 竟然是 Y" |
| **验证** | ★★★★☆ | "你一直是对的，X 确实是 Y" |

### 原型速查

| 原型 | 特征 | 钩子模板 |
|------|------|---------|
| **英雄** | 勇气、转变 | "你的英雄之旅从 X 开始" |
| **导师** | 智慧、指引 | "我希望 X 时有人告诉我 Y" |
| **阴影** | 隐藏、整合 | "你讨厌的那个 X 的自己" |
| **智者** | 真理、洞见 | "古人早就知道的 X" |
| **探索者** | 冒险、自由 | "是时候探索 X 了" |

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1 | 2026-07-02 | 新增 Phase 0.5 供需扫描（三类选题方程判定 + 空位定位）；Phase 4 新增供需分维度（权重最高之一）并设硬性门槛 |
| v2.0 | 2026-01-19 | 融入多学科理论武器库（哲学/心理学/传播学/社会学） |
| v1.1 | 2026-01-15 | 改造为 GitHub 可分发 Plugin 格式 |
| v1.0 | 2026-01-15 | 初始版本，融合 Dan Koe 方法论 |

---

## 参考资料

### Dan Koe 方法论
- [Dan Koe - How Smart Creators Will Build An Audience In 2025](https://thedankoe.com/letters/the-future-of-creators-how-to-build-an-audience-in-2025/)
- [Dan Koe - Prompt: Generate 50+ Good Content Ideas](https://letters.thedankoe.com/p/prompt-generate-50-good-content-ideas)
- [Inside Dan Koe's AI Content Engine](https://pod.wave.co/podcast/the-startup-ideas-podcast-419dd166-eb67-4971-ab0f-a963c1d70d97/inside-dan-koes-ai-content-engine)

### 理论武器库
- See the full "Reference: Theory Arsenal" section below for complete framework details.

---

# Reference: Theory Arsenal

> A comprehensive theoretical framework combining philosophy, psychology, communication studies, and sociology for generating viral content topics.

---

## Table of Contents

1. [Framework Overview](#framework-overview)
2. [Philosophical Weapons](#philosophical-weapons)
3. [Psychological Weapons](#psychological-weapons)
4. [Communication Studies Weapons](#communication-studies-weapons)
5. [Sociological Weapons](#sociological-weapons)
6. [Synthesis Framework: The VIRAL Matrix](#synthesis-framework-the-viral-matrix)
7. [Application Guidelines](#application-guidelines)

---

## Framework Overview

### The Four Pillars of Viral Content

```
                    ┌─────────────────────────────────────┐
                    │        VIRAL TOPIC GENERATION       │
                    └─────────────────────────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
    ┌──────▼──────┐           ┌──────▼──────┐           ┌──────▼──────┐
    │ PHILOSOPHY  │           │ PSYCHOLOGY  │           │COMMUNICATION│
    │  Existential│           │  Emotional  │           │  Attention  │
    │   Tension   │           │  Triggers   │           │   Capture   │
    └──────┬──────┘           └──────┬──────┘           └──────┬──────┘
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                      │
                           ┌──────────▼──────────┐
                           │     SOCIOLOGY       │
                           │  Social Resonance   │
                           │   & Identity        │
                           └─────────────────────┘
```

### Core Principles

| Pillar | Core Function | Key Outcome |
|--------|---------------|-------------|
| **Philosophy** | Create existential tension & meaning | Deep resonance, thought provocation |
| **Psychology** | Trigger emotional responses | Engagement, shares, saves |
| **Communication** | Capture & sustain attention | Click-through, view duration |
| **Sociology** | Activate social identity | Comments, debates, community |

---

## Philosophical Weapons

### 1. Husserl: Phenomenology (现象学)

**Core Concepts:**
- **Intentionality (意向性)**: Consciousness is always consciousness OF something
- **Epoche (悬置)**: Bracketing assumptions to see things anew
- **Essence Intuition (本质直观)**: Grasping the essential nature of things

**Application to Topics:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Assumption Suspension** | "Forget everything you know about [X]" | "Forget everything you know about productivity--start here" |
| **Return to Essence** | "What [X] really is" | "What success really is (not what they told you)" |
| **Fresh Perspective** | "See [X] for the first time" | "See your career for the first time in 10 years" |

**Emotional Triggers:**
- Intellectual curiosity
- Liberation from preconceptions
- Discovery of hidden truths

---

### 2. Heidegger: Existentialism (存在主义)

**Core Concepts:**
- **Dasein (此在)**: Being-in-the-world, our unique mode of existence
- **Being-toward-death (向死而生)**: Awareness of mortality as catalyst for authentic living
- **Authenticity (本真性)**: Living true to oneself vs. "the They" (das Man)
- **Thrownness (被抛状态)**: We are thrown into existence without choosing our circumstances
- **Care (操心)**: Our fundamental relationship with the world

**Application to Topics:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Mortality Awareness** | "You have [limited time] left to [goal]" | "You have 4,000 weeks left. Are you living?" |
| **Authenticity Call** | "Stop living [others' life]" | "Stop living your parents' dream--here's how" |
| **Thrownness Acceptance** | "You didn't choose [circumstance], but..." | "You didn't choose where you were born, but you can choose where you die" |
| **Urgency Creation** | "Before it's too late" | "The one thing you must do before 40" |

**Emotional Triggers:**
- Existential anxiety (productive)
- Urgency for authentic action
- Self-examination impulse

---

### 3. Nietzsche: Will to Power (权力意志)

**Core Concepts:**
- **Will to Power (权力意志)**: The fundamental drive to grow, expand, overcome
- **Eternal Recurrence (永恒轮回)**: Would you live this life infinitely?
- **Ubermensch (超人)**: Transcending limitations to create new values
- **Revaluation of Values (重估一切价值)**: Questioning inherited beliefs

**Application to Topics:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Value Inversion** | "[Traditional virtue] is actually [weakness]" | "Humility is actually holding you back" |
| **Self-Overcoming** | "Become [better version]" | "Become the person who doesn't need motivation" |
| **Infinite Test** | "If you had to [X] forever..." | "If you had to live today forever, would you change it?" |
| **Power Assertion** | "Take control of [X]" | "Stop asking permission to build your life" |

**Emotional Triggers:**
- Desire for self-mastery
- Rebellion against conformity
- Ambition activation

---

### 4. Foucault: Power/Knowledge (权力/知识)

**Core Concepts:**
- **Power/Knowledge (权力/知识)**: Knowledge and power are inseparable
- **Discourse (话语)**: Language constructs reality and controls thought
- **Discipline (规训)**: How institutions shape behavior
- **Technologies of Self (自我技术)**: Practices of self-formation

**Application to Topics:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Power Exposure** | "Why [institution] wants you to believe [X]" | "Why schools want you to believe grades matter" |
| **Discourse Disruption** | "[Common belief] is a construct" | "'Career ladder' is a construct that traps you" |
| **Hidden Control** | "How [X] controls your [Y]" | "How social media controls your thoughts (without you knowing)" |
| **Self-Liberation** | "Escape the [system]" | "Escape the productivity industrial complex" |

**Emotional Triggers:**
- Desire for autonomy
- Suspicion of authority
- Awakening from manipulation

---

### 5. Levinas: The Other (他者伦理)

**Core Concepts:**
- **The Face (面容)**: The Other's face demands ethical response
- **Infinite Responsibility (无限责任)**: We are responsible for the Other before ourselves
- **Alterity (他异性)**: The irreducible difference of the Other

**Application to Topics:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Relational Frame** | "What you owe to [others]" | "What you owe to your future self" |
| **Empathy Activation** | "What [others] never tell you" | "What your parents never told you about money" |
| **Legacy Thinking** | "What will [others] remember?" | "What will your kids remember about you?" |

**Emotional Triggers:**
- Empathy and connection
- Responsibility awakening
- Legacy consciousness

---

### 6. Wittgenstein: Language Games (语言游戏)

**Core Concepts:**
- **Language Games (语言游戏)**: Meaning is determined by use in context
- **Family Resemblance (家族相似性)**: Concepts share overlapping features, not essences
- **Meaning as Use (意义即用法)**: Words mean what we do with them

**Application to Topics:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Redefinition** | "[Word] doesn't mean what you think" | "'Success' doesn't mean what you think" |
| **Linguistic Unmasking** | "Why we call it [X]" | "Why we call it 'side hustle' (and why that's wrong)" |
| **New Vocabulary** | "The word for [phenomenon] is..." | "There's a word for feeling successful but empty: it's called..." |

**Emotional Triggers:**
- Intellectual clarity
- Language ownership
- Conceptual freedom

---

### 7. Stoicism: Dichotomy of Control (二分法)

**Core Concepts:**
- **Dichotomy of Control (二分法)**: Distinguish what you can and cannot control
- **Premeditatio Malorum (预期苦难)**: Anticipate difficulties to prepare
- **Amor Fati (命运之爱)**: Love your fate, embrace all that happens
- **Assent (同意)**: Control your judgments about events

**Application to Topics:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Control Focus** | "The only thing you can control about [X]" | "The only thing you can control about your career" |
| **Obstacle Reframe** | "[Problem] is actually [opportunity]" | "Getting fired was the best thing that happened to me" |
| **Anti-anxiety** | "Why [fear] doesn't matter" | "Why rejection doesn't matter (Stoic perspective)" |
| **Fate Embrace** | "Stop fighting [reality]" | "Stop fighting your age--use it" |

**Emotional Triggers:**
- Peace and acceptance
- Empowerment
- Resilience building

---

## Psychological Weapons

### 1. Jung: Collective Unconscious (集体无意识)

**Core Concepts:**
- **Archetypes (原型)**: Universal patterns in the collective psyche
- **Shadow (阴影)**: Repressed aspects of personality
- **Persona (人格面具)**: The mask we show to the world
- **Individuation (个体化)**: Integration of all psychic elements

**Key Archetypes for Content:**

| Archetype | Characteristics | Topic Angle |
|-----------|----------------|-------------|
| **Hero** | Courage, sacrifice, transformation | "Your hero's journey starts now" |
| **Mentor** | Wisdom, guidance, teaching | "What I wish someone told me at 25" |
| **Shadow** | Hidden desires, fears, darkness | "The dark side of success no one talks about" |
| **Trickster** | Disruption, humor, boundary-breaking | "Why breaking rules is the only way to win" |
| **Sage** | Knowledge, truth, understanding | "The ancient wisdom that changed my life" |
| **Orphan** | Abandonment, resilience, belonging | "You're not broken--you're just different" |

**Application to Topics:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Shadow Integration** | "The [negative trait] that's actually..." | "The laziness that made me successful" |
| **Persona Stripping** | "Behind the [external success]..." | "Behind every '6-figure entrepreneur' post..." |
| **Archetype Activation** | "Awaken your inner [archetype]" | "Awaken your inner creator" |
| **Individuation Call** | "Become who you were meant to be" | "Stop being who they made you--become who you are" |

**Emotional Triggers:**
- Self-discovery
- Integration of rejected parts
- Mythological resonance

---

### 2. Cognitive Biases

**Key Biases for Viral Content:**

| Bias | Description | Application |
|------|-------------|-------------|
| **Loss Aversion** | Losses hurt more than gains feel good | "What you're losing by not [action]" |
| **Social Proof** | We follow what others do | "Why 90% of successful people do [X]" |
| **Scarcity** | Rare things are more valuable | "The skill that's disappearing (learn it now)" |
| **Authority** | We trust experts | "Harvard study reveals..." |
| **Reciprocity** | We return favors | "Free: my complete [resource]" |
| **Anchoring** | First number shapes perception | "From $0 to $1M (my exact path)" |
| **Dunning-Kruger** | Incompetence -> Overconfidence | "The skill you think you have but don't" |
| **Confirmation** | We seek agreeing information | "If you've ever felt [common feeling]..." |

---

### 3. Maslow: Hierarchy of Needs (需求层次)

| Level | Need | Topic Angle |
|-------|------|-------------|
| **Self-Actualization** | Meaning, purpose, potential | "Finding your life's purpose" |
| **Esteem** | Recognition, achievement | "How to be respected in any room" |
| **Love/Belonging** | Connection, community | "Why you feel alone (even with friends)" |
| **Safety** | Security, stability | "Financial security in uncertain times" |
| **Physiological** | Health, energy, basics | "The one habit that fixes your energy" |

**Application Strategy:**
- Identify which level your audience is operating from
- Create content that addresses their current need
- Promise transition to higher level

---

### 4. Emotional Trigger Framework

**The 12 Core Emotional Triggers:**

| Trigger | Description | Power Level | Example Hook |
|---------|-------------|-------------|--------------|
| **Fear** | Threat to safety, status, or identity | ★★★★★ | "The silent career killer" |
| **Curiosity** | Information gap, mystery | ★★★★★ | "What successful people never say publicly" |
| **Anger** | Injustice, frustration | ★★★★☆ | "The lie we've all been told about [X]" |
| **Hope** | Possibility, potential | ★★★★☆ | "It's not too late to [achieve X]" |
| **Pride** | Achievement, identity | ★★★★☆ | "Join the 1% who understand [X]" |
| **Shame** | Social judgment, inadequacy | ★★★☆☆ | "Are you still doing [outdated thing]?" |
| **Envy** | Desire for others' advantages | ★★★☆☆ | "How they have [X] and you don't" |
| **Belonging** | Tribal identity | ★★★☆☆ | "If you're a [identity], this is for you" |
| **Surprise** | Unexpected revelation | ★★★★☆ | "The counterintuitive truth about [X]" |
| **Nostalgia** | Longing for the past | ★★★☆☆ | "Remember when [X]? Here's how to get it back" |
| **Relief** | Solution to pain | ★★★★☆ | "Finally: the fix for [common problem]" |
| **Validation** | Confirmation of beliefs | ★★★★☆ | "You were right to question [X]" |

---

## Communication Studies Weapons

### 1. Attention Capture Framework

**The AIDA Model Enhanced:**

| Stage | Goal | Techniques |
|-------|------|------------|
| **A - Attention** | Stop the scroll | Numbers, questions, contrarian statements |
| **I - Interest** | Create curiosity gap | Promise, mystery, specificity |
| **D - Desire** | Activate emotional response | Benefits, transformation, social proof |
| **A - Action** | Drive engagement | CTA, open loops, controversy |

**Pattern Interrupts:**
- Unexpected juxtaposition: "Lazy people make better CEOs"
- Specific numbers: "The 4:53 AM rule that changed my life"
- Direct address: "You. Yes, you reading this."
- Questions that demand answers: "Why do you work so hard?"

---

### 2. Framing Theory (框架理论)

**Key Frames for Content:**

| Frame Type | Description | Example |
|------------|-------------|---------|
| **Gain Frame** | Emphasize what you'll get | "3 habits that will double your income" |
| **Loss Frame** | Emphasize what you'll lose | "3 habits destroying your income" |
| **Conflict Frame** | Present as battle/tension | "The war between your two selves" |
| **Human Interest** | Personal story angle | "How I went from homeless to CEO" |
| **Moral Frame** | Right vs. wrong | "The ethical way to build wealth" |
| **Economic Frame** | Cost-benefit focus | "The real cost of staying in your job" |

**Frame Selection Guide:**
- Use LOSS frame for urgent/protective content (2x more powerful)
- Use GAIN frame for aspirational/growth content
- Use CONFLICT frame for engagement/comments
- Use HUMAN INTEREST for shares/emotional connection

---

### 3. Narrative Transportation

**Story Elements That Transport:**

| Element | Function | Application |
|---------|----------|-------------|
| **Character** | Identification point | "I was just like you..." |
| **Conflict** | Creates tension | "Then everything changed" |
| **Transformation** | Demonstrates possibility | "Now I understand what matters" |
| **Specificity** | Creates believability | "March 15, 2023, 3 AM" |
| **Sensory Details** | Engages imagination | "I could smell the coffee burning" |

---

### 4. Tension & Release

**Creating Productive Tension:**

| Tension Type | Source | Resolution Promise |
|--------------|--------|-------------------|
| **Cognitive** | Contradictory ideas | "This makes no sense, but..." |
| **Emotional** | Unresolved feelings | "You've felt this but couldn't name it" |
| **Informational** | Knowledge gap | "The answer will surprise you" |
| **Social** | Status threat | "Are you falling behind?" |
| **Temporal** | Time pressure | "Before the window closes" |

---

## Sociological Weapons

### 1. Social Identity Theory (社会认同理论)

**Core Concepts:**
- In-group/Out-group dynamics
- Social categorization
- Identity-based behavior

**Application to Topics:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Tribal Activation** | "If you're a [identity]..." | "If you're an introvert, this is your superpower" |
| **In-group Signaling** | "[Identity] people understand..." | "Only entrepreneurs understand this pain" |
| **Out-group Contrast** | "[In-group] vs [out-group]" | "Creators vs. Consumers: which are you?" |
| **Identity Aspiration** | "Become a [desired identity]" | "Become the person who doesn't need validation" |

---

### 2. Social Comparison Theory (社会比较理论)

**Comparison Types:**

| Type | Direction | Application |
|------|-----------|-------------|
| **Upward** | Compare to better-off | "What successful people do differently" |
| **Downward** | Compare to worse-off | "At least you're not making these mistakes" |
| **Lateral** | Compare to peers | "What your competitors know that you don't" |

---

### 3. Symbolic Interactionism (符号互动论)

**Core Concepts:**
- Meaning is created through social interaction
- Self-concept formed through others' reactions
- Symbols (language, images) carry shared meaning

**Application:**

| Technique | Formula | Example |
|-----------|---------|---------|
| **Symbol Reframing** | "[Symbol] means something different now" | "What 'success' really means in 2026" |
| **Self-Concept Challenge** | "The story you tell yourself about [X]" | "The story you tell yourself about failure is wrong" |
| **Social Script Disruption** | "You don't have to [expected behavior]" | "You don't have to love your job" |

---

### 4. Cultural Capital Theory (文化资本理论)

**Types of Capital:**

| Type | Description | Content Angle |
|------|-------------|---------------|
| **Economic** | Money, assets | "How to build wealth without a high salary" |
| **Cultural** | Knowledge, skills, tastes | "The skills no one teaches in school" |
| **Social** | Networks, relationships | "Your network is your net worth" |
| **Symbolic** | Recognition, status | "How to be taken seriously in any field" |

---

## Synthesis Framework: The VIRAL Matrix

### The VIRAL Formula

```
V - Validation/Violation (of expectations)
I - Identity activation
R - Resonance (emotional)
A - Attention capture
L - Logic & legitimacy
```

### Scoring System

For each topic, score 1-10 on each dimension:

| Dimension | Low Score (1-3) | Medium Score (4-6) | High Score (7-10) |
|-----------|-----------------|--------------------|--------------------|
| **V** | Confirms expectations | Slightly challenges | Violates/validates powerfully |
| **I** | Generic audience | Some identity markers | Strong identity activation |
| **R** | Mild emotion | Moderate emotional response | Deep emotional trigger |
| **A** | Blends in | Somewhat interesting | Scroll-stopping |
| **L** | Weak support | Some evidence | Strong credibility |

**Viral Potential Formula:**
```
Viral Score = (V x 1.5) + (I x 1.2) + (R x 1.3) + (A x 1.5) + (L x 0.5)
             ─────────────────────────────────────────────────────────
                                        6

Target: Score >= 7.5 for high viral potential
```

---

### Combined Topic Generation Matrix

Cross-reference philosophical concepts with psychological triggers:

|  | Fear | Curiosity | Anger | Hope | Pride |
|--|------|-----------|-------|------|-------|
| **Heidegger (Mortality)** | "Time is running out" | "What if you only had 1 year?" | "You're wasting your life" | "It's not too late" | "You lived fully" |
| **Nietzsche (Power)** | "You're being controlled" | "What greatness looks like" | "They want you weak" | "Become unstoppable" | "Master yourself" |
| **Foucault (Discourse)** | "The system traps you" | "Hidden power structures" | "They're lying to you" | "Break free" | "You see through it" |
| **Jung (Shadow)** | "Your dark side" | "Hidden parts of yourself" | "Rejected emotions" | "Integrate & transform" | "Whole self" |
| **Stoic (Control)** | "False fears" | "What truly matters" | "Misplaced effort" | "Inner peace possible" | "Mental fortress" |

---

## Application Guidelines

### Topic Generation Workflow

1. **Select Primary Theory**
   - Choose 1-2 philosophical frameworks that fit the topic
   - Identify relevant psychological triggers

2. **Define Tension Type**
   - Cognitive? Emotional? Social? Temporal?
   - What gap or dissonance will you create?

3. **Choose Frame**
   - Gain or Loss?
   - What story structure?

4. **Activate Identity**
   - Who is this for?
   - What in-group are you speaking to?

5. **Craft Hook**
   - Apply attention capture techniques
   - Test with VIRAL score

6. **Validate**
   - Does it align with brand persona?
   - Is it ethically sound?
   - Would you share it?

### Ethical Guidelines

**DO:**
- Use tension to inspire positive action
- Challenge beliefs to promote growth
- Create urgency for genuine benefit

**DON'T:**
- Exploit fears manipulatively
- Create false scarcity
- Shame without redemption path
- Make unfounded claims

### Quick Reference: Theory -> Topic Pattern

| Theory | Primary Emotion | Best Hook Type | Example Pattern |
|--------|-----------------|----------------|-----------------|
| Husserl | Curiosity | Fresh Perspective | "See X anew" |
| Heidegger | Urgency | Mortality Awareness | "Before it's too late" |
| Nietzsche | Ambition | Value Inversion | "X is actually Y" |
| Foucault | Liberation | Power Exposure | "Why they want you to believe X" |
| Levinas | Connection | Relational Frame | "What you owe to X" |
| Wittgenstein | Clarity | Redefinition | "X doesn't mean what you think" |
| Stoicism | Peace | Control Focus | "The only thing that matters about X" |
| Jung | Discovery | Shadow Work | "The hidden side of X" |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-01-19 | Initial theory arsenal framework |

---

## References

### Philosophy
- Husserl, E. (1913). *Ideas Pertaining to a Pure Phenomenology*
- Heidegger, M. (1927). *Being and Time*
- Nietzsche, F. (1883). *Thus Spoke Zarathustra*
- Foucault, M. (1975). *Discipline and Punish*
- Levinas, E. (1961). *Totality and Infinity*
- Wittgenstein, L. (1953). *Philosophical Investigations*
- Epictetus. *Enchiridion*

### Psychology
- Jung, C.G. (1959). *The Archetypes and the Collective Unconscious*
- Kahneman, D. (2011). *Thinking, Fast and Slow*
- Cialdini, R. (2006). *Influence: The Psychology of Persuasion*

### Communication
- Entman, R. (1993). Framing: Toward Clarification of a Fractured Paradigm
- Green, M. & Brock, T. (2000). The Role of Transportation in the Persuasiveness of Public Narratives

### Sociology
- Tajfel, H. & Turner, J. (1979). Social Identity Theory
- Festinger, L. (1954). Social Comparison Theory
- Bourdieu, P. (1984). *Distinction: A Social Critique of the Judgement of Taste*
