---
name: cover-title
description: 生成高转化的封面文案和内容标题，支持公众号、小红书、抖音、X 等多平台。优化自然流量和搜索流量的点击率。
---

# Cover Title Skill

Generate platform-optimized cover text (封面文案) and content titles (内容标题) that maximize click-through from both natural and search traffic.

## Trigger Phrases

- `/cover-title`
- `/封面标题`
- "generate cover title"
- "写封面文案"
- "封面文字"

## Core Principle: Two Texts, Two Opportunities

封面文案和内容标题是两次独立的点击机会：两处写一样的文字，等于主动放弃其中一次。

Every piece of content gets **two separate texts** serving different purposes:

| Text Type | Purpose | Audience | Traffic Type | Optimization Goal |
|-----------|---------|----------|--------------|-------------------|
| **Cover Text (封面文案)** | Displayed on thumbnail/cover image | Human eyes scrolling feeds | Natural traffic (自然流) | Emotion triggers: 贪嗔痴 (greed, anger, desire) |
| **Content Title (内容标题)** | Platform title/headline field | Search algorithms + humans | Search traffic (搜索流) | Keyword density + readability |

**Rule: Cover text and content title MUST be different.** Same text = wasted opportunity.

---

## Usage

```
/cover-title <topic-or-article-path> [options]

Options:
  --platform <name>      Single platform (youtube, xhs, wechat-video, x, facebook, instagram, tiktok, douyin)
  --platforms <list>     Multiple platforms, comma-separated (e.g., "youtube,xhs,douyin")
  --lang <zh|en|both>   Language (default: auto-detect from topic)
  --keywords <list>     Target SEO keywords, comma-separated
  --emotion <type>      Primary emotion trigger (see Emotion Framework below)
  --cover-image          Also generate cover image via /baoyu-cover-image
  --style <name>        Cover image style when using --cover-image (elegant/tech/warm/bold/minimal/playful/nature/retro)
  --brand <name>        Brand persona (如有品牌配置，由系统提示自动注入，无需手动指定)
```

### Quick Examples

```
# Generate cover titles for all Chinese platforms
/cover-title "AI 时代普通人如何逆袭" --platforms xhs,douyin,wechat-video

# Generate with cover image
/cover-title ./articles/2026-03-12-ai-tools/index.md --platform youtube --cover-image

# English multi-platform
/cover-title "Why most developers will be replaced by 2027" --platforms youtube,x,instagram --lang en

# Specify emotion and keywords
/cover-title "程序员35岁危机" --platforms xhs,douyin --emotion fear --keywords "程序员,35岁,转行,副业"
```

---

## Platform Specifications (2026)

### Character Limits & Display Rules

| Platform | Content Title Limit | Cover Text Limit | Cover Aspect Ratio | Language |
|----------|--------------------|--------------------|-------------------|----------|
| **YouTube** | 100 chars (70 visible desktop, 50-60 mobile) | 3-5 words / ~20 chars on thumbnail | 16:9 (1280×720) | EN / ZH |
| **小红书 (Xiaohongshu)** | 20 chars | 2-3 lines, 6-15 chars per line | 3:4 (1242×1660) | ZH |
| **微信视频号 (WeChat Video)** | 16 chars recommended (feeds truncate) | 2-3 lines, 6-12 chars per line | 16:9 or 3:4 | ZH |
| **X (Twitter)** | 280 chars (free) / 25K (premium) | 3-6 words for article cards | 16:9 (1200×675) | EN / ZH |
| **Facebook** | 255 chars (50 chars optimal) | 3-5 words on video cover | 16:9 or 1:1 | EN |
| **Instagram** | 2200 chars caption (~55 visible) | 3-5 words on Reels cover | 9:16 (1080×1920) | EN |
| **TikTok** | 2200-4000 chars description | 2-4 words on cover | 9:16 (1080×1920) | EN |
| **抖音 (Douyin)** | 55 chars (15-20 chars display) | 2-3 lines, 6-12 chars per line | 9:16 (1080×1920) | ZH |

### Platform-Specific Rules

#### YouTube
- **Content Title**: Front-load keywords in first 50 chars. Use number + benefit formula. Avoid clickbait that YouTube penalizes.
- **Cover Text**: MAX 5 words. High contrast. ALL CAPS for English. Use emoji sparingly. Must be readable at 120px thumbnail size.
- **Key insight**: Thumbnail text should complete the title, not repeat it.

#### 小红书 (Xiaohongshu)
- **Content Title**: Strict 20-char limit. Use「」for emphasis. Include trending topic tags.
- **Cover Text**: Large text, 2-3 lines max. Use contrasting colors. Emotional hooks dominate. Numbers and lists convert well ("3个方法", "90%的人不知道").
- **Key insight**: Cover is everything on XHS — users scroll by image, not title. Cover text IS the hook.

#### 微信视频号 (WeChat Video)
- **Content Title**: Keep under 16 chars for full display in feeds. Can use #话题# for discovery.
- **Cover Text**: Clean, minimal text. Trust-building tone. Slightly more serious than Douyin/XHS.
- **Key insight**: WeChat audience skews older and more professional — less clickbait, more value-forward.

#### X (Twitter)
- **Content Title**: For articles/long-form: compelling headline. For posts: first line is the hook.
- **Cover Text**: Article card shows title + subtitle — use both strategically. Keep card text under 6 words.
- **Key insight**: Intellectual curiosity + contrarian takes perform best. Thread hooks need to be standalone.

#### Facebook
- **Content Title**: Under 50 chars for maximum engagement. Questions and "How to" perform well.
- **Cover Text**: Video covers: 3-5 words max. Post images: can include slightly more context.
- **Key insight**: Facebook prioritizes meaningful interaction — emotional/relatable > pure clickbait.

#### Instagram
- **Content Title**: First line of caption (before "...more") is your title — keep under 55 chars.
- **Cover Text**: Reels cover: 2-5 bold words. Must be visible against video background. Use text stickers or burned-in text.
- **Key insight**: Visual-first platform. Cover text supplements the visual, not the other way around.

#### TikTok
- **Content Title**: Use description for SEO keywords. First 2 lines visible without expanding.
- **Cover Text**: 2-4 words MAX. Bold, centered. Must pop at small size in profile grid.
- **Key insight**: Hook in first 1 second matters more than cover, but cover drives profile page clicks.

#### 抖音 (Douyin)
- **Content Title**: 15-20 chars optimal for display. Front-load value proposition.
- **Cover Text**: Similar to TikTok but Chinese text needs larger font. 6-12 chars per line, 2-3 lines max. Yellow/white text on dark backgrounds converts well.
- **Key insight**: Cover text templates that work: "X天后...", "99%的人不知道...", "千万别...", "原来...这么简单"

---

## Title Optimization Engine: 4D Arsenal (四维武器库)

> Adapted from `/chinese-viral-writer` core methodology. Every title candidate MUST be generated through
> at least 2 of the 4 dimensions. Cover text focuses on Philosophy + Psychology (emotional hijacking).
> Content title focuses on Communication + Sociology (share-driving + identity recognition).

### Dimension 1: Philosophy — Cognitive Hijacking for Cover Text

Cover text has < 0.3 seconds to hijack a scrolling thumb. These 6 philosophical weapons create
instant cognitive capture:

#### 1.1 Husserl — Intentionality Anchors (意向性锚点)

Consciousness needs a concrete object to latch onto. Abstract = scroll past. Concrete = stop.

| Principle | Bad Cover Text | Good Cover Text | Why |
|-----------|---------------|-----------------|-----|
| Concrete > Abstract | "AI改变生活" | "凌晨3点 AI帮我写完了年终报告" | Specific time + action = mental image |
| Numbers anchor perception | "赚了很多钱" | "第37天 收入破万" | "37天" is an intentionality anchor — oddly specific = believable |
| Sensory details | "工作很累" | "连续加班到眼睛充血" | Physical sensation triggers embodied cognition |

**Cover Text Formula**: `[Concrete Time/Number] + [Specific Action/Scene] + [Unexpected Result]`

**Examples**:
- ZH: "第3天 我删掉了所有社交App" / "28岁 存款从0到100万"
- EN: "Day 14: I fired my boss" / "3AM and my AI made $2,000"

#### 1.2 Nietzsche — Will to Power Assertions (权力意志断言)

Absolute statements force readers to react — either agree (share) or disagree (comment). Both = engagement.

| Strength Level | Pattern | Example (ZH) | Example (EN) |
|---------------|---------|---------------|--------------|
| **Medium** | [Group] + [contrarian opinion] | "程序员最不该学的就是编程" | "The worst thing a developer can learn is code" |
| **Strong** | [Absolute] + [hidden value judgment] | "2026年还在投简历的人 不是懒 是蠢" | "If you're still sending resumes in 2026, you're not lazy — you're clueless" |
| **Provocative** | [Challenge identity] | "你的努力 其实是一种逃避" | "Your hard work is actually avoidance" |

**Strength Calibration by Platform**:
- XHS/Douyin: Strong-Provocative (algorithm rewards engagement)
- WeChat Video: Medium-Strong (audience prefers nuance)
- YouTube/X: Strong (contrarian performs, but avoid hate-bait)
- Instagram/TikTok: Medium-Strong (visual platform, text is secondary)

⚠️ **Guardrail**: Provocative assertions must be defensible in the content. Click-rage without payoff = unfollow.

#### 1.3 Foucault — Discourse Power / New Concept Naming (话语权力)

Whoever names the phenomenon controls how people think about it. Creating a new term in the cover text = instant intellectual authority.

| Naming Technique | Pattern | Example |
|-----------------|---------|---------|
| **Contrast Naming** | [Old identity] → [New identity] | "从打工人到「个人公司」" / "From employee to 'Company of One'" |
| **Number Naming** | [Specific number] + [phenomenon] | "「348个月囚徒」" (= 29 years of mortgage) |
| **Reversal Naming** | [Positive word] + [Negative meaning] | "「高薪穷人」的陷阱" / "The 'High-Salary Poor' Trap" |
| **Metaphor Naming** | [Unrelated domain] → [Your domain] | "代码农药" / "Prompt Addiction" |
| **Time Naming** | [Year/Era] + [Syndrome] | "2026综合症" / "Post-AI Syndrome" |

**For Content Titles**: Embed the coined term WITH search keywords:
- Cover: "「高薪穷人」"
- Title: "高薪穷人现象：月入3万为什么还是月光？5个破局方法"

#### 1.4 Levinas — Mirror Effect (他者面容 / 镜像效应)

The most powerful cover text makes the reader think: "This is about ME."

| Mirror Depth | Pattern | Example |
|-------------|---------|---------|
| **Shallow** "I know people like this" | [Common group label] | "北漂人" / "Remote workers" |
| **Medium** "This is people I know" | [Group] + [Specific daily scenario] | "每天通勤2小时的你" / "You, refreshing LinkedIn at 2AM" |
| **Deep** "This IS me" | [Scenario] + [Unspoken psychological truth] | "嘴上说躺平 半夜偷偷刷招聘" / "You say you don't care but you check your analytics every hour" |

**Cover Text Formula**: `[Specific group] + [Daily behavior] + [Hidden truth they won't admit]`

This is the most powerful hook for **XHS** and **Douyin** where personal resonance drives shares.

#### 1.5 Wittgenstein — Language Games (语言游戏)

The same topic can be expressed in infinite "language games." This is WHY cover text and content title
MUST be different — they play different language games for different audiences.

| Language Game | Suited For | Tone | Example Topic: "AI取代程序员" |
|--------------|-----------|------|-------------------------------|
| **Confession** | Cover text | Intimate, vulnerable | "我被AI取代了 但我不后悔" |
| **Warning** | Cover text | Urgent, alarming | "程序员 你的时间不多了" |
| **Analysis** | Content title | Rational, authoritative | "2026年AI对程序员就业市场的5大影响及应对策略" |
| **Story** | Cover text | Narrative, curious | "那个学了10年编程的朋友 转行了" |
| **Provocation** | Cover text | Combative, absolute | "学编程？不如学提示词" |
| **Tutorial** | Content title | Helpful, searchable | "程序员转型AI工程师完整指南｜附学习路线图" |

**Mandatory Rule**: Cover text and content title must use DIFFERENT language games. This naturally ensures they are different texts targeting different cognitive modes.

#### 1.6 Stoics — Anxiety Reframing (控制二分法)

Titles that name an anxiety AND offer a reframe outperform pure anxiety triggers.

**Three-Step Title Formula**:
1. **Acknowledge**: Name the fear (creates resonance)
2. **Reframe**: Shift perspective (creates relief)
3. **Redirect**: Point to controllable action (creates hope)

| Step | Cover Text Example | Content Title Example |
|------|-------------------|----------------------|
| Acknowledge only | "35岁 被裁了" | ❌ Too dark, no payoff |
| Acknowledge + Reframe | "35岁被裁 反而是最好的事" | "35岁被裁后我才发现：打工才是最大的风险" |
| Full 3-step | "35岁被裁 我反而年入百万" | "35岁被裁程序员的逆袭路线图：从失业到自由职业月入10万" |

---

### Dimension 2: Psychology — Emotional Trigger Layer

#### 2.1 Emotion Triggers: 12 Types with Transmission Potential

封面是给刷信息流的人看的，靠情绪抓住注意力——贪、嗔、痴是三类最有效的情绪扳机。

| Category | Emotion | Arousal | Virality | Cover Patterns (ZH) | Cover Patterns (EN) |
|----------|---------|---------|----------|---------------------|---------------------|
| **贪 (Greed)** | Desire 欲望 | High | Strong | "月入X万的秘密", "0成本..." | "How I made $X in...", "$0 to $X" |
| **贪** | FOMO 错失 | High | Extreme | "再不学就晚了", "最后X天" | "Before it's too late", "You're already behind" |
| **贪** | Curiosity 好奇 | High | Strong | "原来...这么简单", "很少人知道" | "The secret behind...", "What nobody tells you" |
| **嗔 (Anger)** | Outrage 愤怒 | Extreme | Extreme | "凭什么？", "太离谱了" | "This is insane", "How is this legal?" |
| **嗔** | Injustice 不公 | High | Strong | "被骗了X年", "真相是..." | "You've been lied to", "The truth they hide" |
| **嗔** | Fear 恐惧 | High | Strong | "千万别...", "X岁还不懂就完了" | "Stop doing this NOW", "The #1 mistake" |
| **痴 (Delusion)** | Belonging 归属 | Medium | Strong | "只有X的人才懂", "同类人" | "If you're a..., this is for you" |
| **痴** | Superiority 优越 | Medium | Medium | "高手都在用的...", "聪明人的选择" | "What top 1% know", "Elite habits" |
| **痴** | Nostalgia 怀旧 | Medium | Medium | "小时候...", "那些年..." | "Remember when...", "We lost this" |
| **Other** | Hope 希望 | Medium | Medium | "从X到X，我只用了...", "逆袭" | "From $0 to $X", "My comeback story" |
| **Other** | Shock 震惊 | High | Strong | "万万没想到", "颠覆认知" | "I can't believe...", "Mind-blowing" |
| **Other** | Empathy 共鸣 | Medium | Strong | "你是不是也...", "每次...的时候" | "If you've ever felt...", "We all do this" |

**Viral Combination Formula**: High arousal + Social proof = maximum spread
- Best combos: `Anger + Empathy`, `Fear + Hope`, `Curiosity + Shock`, `FOMO + Desire`
- Cover text should layer 2 emotions (primary + secondary)

#### 2.2 Jungian Archetypes for Title Personas

Match the title's "voice" to the reader's current psychological state:

| Reader State | Archetype | Cover Text Voice | Content Title Voice |
|-------------|-----------|-----------------|---------------------|
| Confused, lost | **Sage 智者** | "我终于想明白了" / "It finally clicked" | "The framework that changed everything about X" |
| Facing challenge | **Hero 英雄** | "一个人 干翻了整个团队" / "Me vs. an entire team" | "How one developer outperformed a team of 10" |
| Questioning norms | **Rebel 叛逆者** | "规则是给不会玩的人定的" / "Rules are for amateurs" | "Why breaking [industry norm] is the smartest move in 2026" |
| Seeking belonging | **Everyman 普通人** | "和你一样 我也迷茫过" / "I was lost too" | "What I wish someone told me when I started [X]" |
| Wanting breakthrough | **Explorer 探索者** | "辞职后第100天" / "100 days after quitting" | "My unconventional path from [A] to [B]" |
| Wanting control | **Ruler 统治者** | "我的时间 我说了算" / "My time, my rules" | "The complete system for taking control of your [X]" |
| Needs magic solution | **Magician 魔术师** | "一个操作 省了10万" / "One trick, $10K saved" | "The single change that transformed my [X]" |

**Rule**: Cover text activates archetype emotionally. Content title delivers on the archetype's promise rationally.

#### 2.3 Cognitive Biases as Title Weapons

Deploy specific cognitive biases in title construction:

| Bias | Mechanism | Cover Text Application | Content Title Application |
|------|-----------|----------------------|--------------------------|
| **Anchoring** | First number sets perception | "从负债50万到..." (50万 anchors the magnitude) | Include anchor number early in title |
| **Loss Aversion** | Loss > Gain (2:1) | "你正在失去的3个机会" > "你能获得的3个机会" | Frame as "stop losing X" not "start gaining X" |
| **Scarcity** | Rare = valuable | "只有2%的人知道", "即将消失的..." | "Limited", "Before [platform] patches this" |
| **Curiosity Gap** | Incomplete info = irresistible | "我用了一个方法...结果" (don't reveal!) | Complete the gap: "The exact method I used to [result]" |
| **Social Proof** | Follow majority | "100万人已经在做了" | "Why X million people are switching to [Y]" |
| **Authority Bias** | Trust experts | "Google前VP说的一句话" | "Ex-Google VP reveals: [searchable insight]" |
| **Peak-End Rule** | Remember peaks + endings | Cover shows the PEAK moment | Title promises the peak + actionable ending |
| **Framing Effect** | Same fact, different frame | "你「浪费」的时间 其实是在投资" | Reframe the topic in title |

#### 2.4 Maslow's Hierarchy: Depth of Title Pull

Titles touching LOWER needs = stronger gravitational pull:

| Need Level | Pull Strength | Title Direction | Example Cover Text |
|-----------|--------------|-----------------|-------------------|
| **Survival** 生存 | ★★★★★ | Income, employment, health | "失业第30天 房贷还不上了" |
| **Safety** 安全 | ★★★★ | Job security, financial safety | "你的Plan B准备好了吗" |
| **Belonging** 归属 | ★★★ | Loneliness, acceptance, community | "没有人理解你对吧" |
| **Esteem** 尊重 | ★★ | Recognition, being valued | "你的价值 不该由老板定义" |
| **Self-Actualization** 自我实现 | ★ | Purpose, meaning, potential | "活成自己想要的样子" |

**Strategy**: Cover text should target 1-2 levels BELOW the content's actual topic. Content titles should target the actual topic level.
- Example: Article about self-actualization → Cover touches **safety fear** ("你现在的舒适区 正在杀死你"), Title promises **self-actualization** ("如何找到你真正热爱的事业：一个7步框架")

---

### Dimension 3: Communication — Share-Driving Layer for Content Titles

#### 3.1 Framing Theory: Same Topic, Different Title Angle

| Frame Type | How to Apply | Example: Topic "远程办公" |
|-----------|-------------|---------------------------|
| **Problem Reframe** | Redefine what the problem IS | "远程办公的问题不是效率 而是孤独" |
| **Attribution Reframe** | Change who/what caused it | "你不是不适合远程 是公司不会管理" |
| **Contrast Reframe** | Change comparison point | "和996比 远程办公才是真正的奋斗" |
| **Time Reframe** | Change time horizon | "3年后 办公室上班会像BB机一样过时" |
| **Identity Reframe** | Change self-perception | "你不是在家办公 你是在经营一家公司" |
| **Value Reframe** | Flip value judgment | "「不稳定」才是远程办公最大的优势" |

**Application**: Generate one candidate pair per frame type, then select the most compelling.

#### 3.2 Golden Sentence Structures for Titles

High-converting titles use **contrast structure** — first half sets expectation, second half subverts it:

| Structure | Formula | Cover Text Example | Content Title Example |
|-----------|---------|-------------------|----------------------|
| **A but B** | [Common belief], but [contrarian truth] | "努力没用的" | "努力不是成功的关键，这个被忽视的习惯才是" |
| **Not A, it's B** | It's not [obvious], it's [deeper] | "不是没钱 是没认知" | "穷的本质不是缺钱，而是缺少这5种认知" |
| **From A to B** | [Starting point] → [Transformation] | "从月薪3千到3万" | "月薪从3千到3万：一个普通人的3年转型全记录" |
| **X can Y, but Z** | [Thing] can [do this], but [bigger thing] | "AI能写代码" | "AI能写代码，但只有懂这个的人才能驾驭AI" |
| **Time contrast** | [Past] I thought X, [now] I know Y | "3年前我以为..." | "3年前我以为学历最重要，现在我发现这件事价值10倍" |
| **Question subversion** | [Expected question] → [Unexpected answer] | "为什么越努力越穷？" | "为什么越努力越穷？因为你努力的方向从一开始就错了" |

#### 3.3 Social Currency: Why People Share Titles

Every share is an identity statement. Your title must give the sharer social capital:

| Currency Type | What Sharer Gets | Title Strategy | Example |
|-------------|-----------------|----------------|---------|
| **Insight Currency** | "They're smart/wise" | Deep analysis, contrarian angle | "AI不会取代你 但会用AI的人会" |
| **Attitude Currency** | "They have principles" | Clear stance, bold opinion | "拒绝996 不是躺平 是清醒" |
| **Info Currency** | "They're well-informed" | Exclusive info, insider knowledge | "内部消息：X公司即将..." |
| **Utility Currency** | "They're helpful" | Practical tools, actionable tips | "这个免费工具 替我省了10万" |
| **Emotional Currency** | "They're empathetic" | Warm stories, shared vulnerability | "致每一个在深夜崩溃过的成年人" |
| **Identity Currency** | "They belong to this group" | In-group signals, tribal markers | "只有自由职业者才懂的痛" |

**Rule**: Each candidate pair must explicitly specify which social currency it offers.

#### 3.4 AIDA Mapping: Title as Micro-Funnel

A title IS a compressed AIDA funnel:

```
Cover Text                    Content Title
┌─────────────┐              ┌─────────────────────┐
│  A: Attention│              │  I: Interest         │
│  (Stop scroll)│              │  (Promise value)     │
│              │              │                      │
│  D: Desire   │              │  A: Action           │
│  (Must know!) │              │  (Click to learn)    │
└─────────────┘              └─────────────────────┘
```

- Cover Text handles **Attention + Desire**: Emotional hook that creates an information gap
- Content Title handles **Interest + Action**: Rational promise that justifies the click

---

### Dimension 4: Sociology — Identity Recognition for Maximum Reach

#### 4.1 Social Identity: "Us vs Them" Title Construction

| Strategy | Mechanism | Cover Text Pattern | Content Title Pattern |
|----------|-----------|-------------------|----------------------|
| **Build In-Group** | Create "we" identity | "我们这种人..." / "People like us..." | "A guide for [specific group identity]" |
| **Set Boundaries** | Define who's in/out | "和打工人不同 我们选择..." | "Why [in-group] are different from [out-group]" |
| **Common Enemy** | External threat unites | "资本不想让你知道的..." | "What [enemy entity] doesn't want you to know about [X]" |
| **Tribal Pride** | Group is special | "选择这条路的人 都有一种勇气" | "The courage it takes to be a [group identity]" |

⚠️ **Guardrail**: In-group pride ≠ out-group hatred. Build up, don't tear down.

#### 4.2 Social Comparison in Titles

| Comparison Type | Psychology | Cover Text | Content Title |
|----------------|-----------|------------|---------------|
| **Upward** (creates tension) | "They have what I want" | "25岁财务自由的人 都做对了什么" | "How top earners build wealth before 30" |
| **Parallel** (creates belonging) | "They're just like me" | "和你一样 我也焦虑过" | "If you're anxious about [X], you're not alone" |
| **Downward** (creates relief) | "At least I'm not..." | "比起他 我已经够好了" | Use sparingly — can feel cruel |

**Optimal Sequence in Title Pair**:
- Cover Text: **Upward comparison** (creates tension/desire to click)
- Content Title: **Parallel** (creates belonging/trust that content understands them)

#### 4.3 Bourdieu's Cultural Capital in Titles

Sharing your content = displaying cultural capital. Make titles "taste-worthy":

| Capital Level | Cover Text Feel | Content Title Feel |
|--------------|----------------|-------------------|
| **Low** (basic) | "10个赚钱方法" | "10 Ways to Make Money Online" |
| **Medium** (informed) | "被低估的赚钱模式" | "The Most Undervalued Business Model of 2026" |
| **High** (sophisticated) | "纳西姆·塔勒布不会告诉你的" | "What Nassim Taleb Gets Wrong About Antifragile Income" |

**Platform Calibration**:
- XHS/Douyin/TikTok: Medium cultural capital (too high = alienating)
- YouTube/X: Medium-High (intellectual audience)
- WeChat Video: High (educated, professional audience)
- Instagram/Facebook: Low-Medium (accessible, relatable)

#### 4.4 Symbolic Interaction: New Vocabulary = Ownership

When your title introduces a new term, readers who share it spread YOUR language:

| Strategy | Example |
|----------|---------|
| Cover coins the term | "「信息贫困」正在毁掉你" |
| Content title defines it | "什么是信息贫困？为什么90%的人正在经历它" |
| Readers share → term spreads | Your vocabulary becomes their thinking framework |

---

## Emotion Auto-Detection

When `--emotion` is not specified, analyze the topic through Maslow + keyword matching:

```yaml
auto_emotion_rules:
  # Survival / Safety level → High arousal emotions
  - keywords: ["赚钱", "收入", "副业", "失业", "money", "income", "layoff", "fired"]
    primary: desire
    secondary: fear
    maslow: survival

  - keywords: ["危机", "淘汰", "取代", "replaced", "crisis", "obsolete"]
    primary: fear
    secondary: fomo
    maslow: safety

  # Belonging / Esteem level → Medium arousal emotions
  - keywords: ["真相", "骗局", "内幕", "truth", "scam", "exposed", "lies"]
    primary: outrage
    secondary: injustice
    maslow: esteem

  - keywords: ["秘密", "方法", "技巧", "secret", "hack", "trick", "method"]
    primary: curiosity
    secondary: superiority
    maslow: esteem

  - keywords: ["故事", "经历", "journey", "story", "experience", "confession"]
    primary: empathy
    secondary: belonging
    maslow: belonging

  - keywords: ["趋势", "未来", "即将", "trend", "future", "coming", "2026", "2027"]
    primary: fomo
    secondary: curiosity
    maslow: safety

  # Self-actualization level → Layered emotion needed
  - keywords: ["自由", "意义", "使命", "purpose", "freedom", "meaning"]
    primary: hope
    secondary: empathy
    maslow: self_actualization
```

---

## Workflow

### Step 1: Input Analysis

Parse user input to determine:

```yaml
analysis:
  topic: ""                    # Core topic extracted from input
  source_type: "topic"         # topic | article_path | url
  language: "zh"               # zh | en | both
  target_platforms: []         # List of platforms
  brand: null                  # Brand persona if specified
  user_keywords: []            # User-provided SEO keywords
  target_emotion: null         # User-specified or auto-detected
  detected_maslow_level: null  # Auto-detected Maslow need level
  generate_cover_image: false  # Whether to invoke /baoyu-cover-image
```

If an article path is provided, read and analyze the article content.

**Default platform sets:**
- If `--lang zh` → default platforms: `xhs, douyin, wechat-video`
- If `--lang en` → default platforms: `youtube, x, instagram, tiktok`
- If `--lang both` → all 8 platforms

### Step 2: 4D Strategic Analysis

Before generating any text, run a quick 4D analysis of the topic:

```yaml
strategic_analysis:
  philosophy:
    intentionality_anchors: []       # Concrete scenes, numbers, sensory details available
    power_assertion_angle: ""        # Best contrarian/absolute statement
    new_concept_candidates: []       # Potential coined terms (Foucault)
    mirror_target: ""                # Specific group + unspoken truth (Levinas)
    anxiety_reframe: ""              # What anxiety to name + how to reframe (Stoics)

  psychology:
    primary_emotion: ""              # Highest-arousal applicable emotion
    secondary_emotion: ""            # Complementary emotion for layering
    maslow_level: ""                 # Which need level the topic touches
    best_archetype: ""               # Jungian archetype matching reader state
    key_cognitive_biases: []         # Top 3 biases to deploy

  communication:
    best_frame: ""                   # Most compelling reframing angle
    golden_sentence_structure: ""    # Which contrast structure fits best
    social_currency_type: ""         # What sharing this signals about the sharer
    language_game_cover: ""          # Language game for cover text
    language_game_title: ""          # Language game for content title (MUST differ)

  sociology:
    in_group: ""                     # Target group identity
    comparison_direction: ""         # Upward/parallel/downward for cover
    cultural_capital_level: ""       # Per platform calibration
    symbolic_term: ""                # New vocabulary to introduce (if applicable)
```

### Step 3: Keyword Research

For each target platform, extract/generate keywords:

1. **From content**: Extract key phrases, entities, trending terms
2. **From user input**: Use `--keywords` if provided
3. **Platform-specific**: Adjust keyword style per platform norms
   - YouTube: "how to", "best", "2026", "[topic] tutorial"
   - XHS: emoji-rich tags, trending terms, 「」brackets
   - Douyin: 热搜话题, 挑战标签

### Step 4: Generate Candidates

For EACH target platform, generate **3 pairs** of (cover text + content title).

**Each pair MUST use a different combination of 4D weapons**:

```yaml
output_per_platform:
  platform: "xhs"
  language: "zh"
  topic: "程序员35岁危机"
  candidates:
    - pair: 1
      cover_text: "35岁 被裁了 反而年入百万"
      cover_text_chars: 14
      content_title: "程序员35岁被裁后逆袭指南：5个转型方向"
      content_title_chars: 20
      # 4D Analysis
      philosophy_weapons: ["Intentionality (35岁 = concrete anchor)", "Stoic Reframe (被裁→年入百万)"]
      psychology_weapons: ["Hope + Shock (emotion combo)", "Hero archetype", "Anchoring bias (百万)"]
      communication_weapons: ["From A to B golden sentence", "Utility social currency"]
      sociology_weapons: ["Upward comparison (年入百万)", "Programmer in-group"]
      emotion_primary: "hope"
      emotion_secondary: "shock"
      keywords_in_title: ["程序员", "35岁", "转型"]
      why_different: "Cover: Stoic reframe narrative (confession game). Title: Tutorial game with search keywords."

    - pair: 2
      cover_text: "嘴上说躺平 半夜偷偷刷招聘"
      cover_text_chars: 13
      content_title: "35岁程序员的Plan B：不靠跳槽也能月入3万"
      content_title_chars: 20
      philosophy_weapons: ["Levinas Mirror (unspoken truth)", "Nietzsche (identity challenge)"]
      psychology_weapons: ["Empathy + Fear", "Everyman archetype", "Cognitive dissonance bias"]
      communication_weapons: ["Identity reframe", "Emotional social currency"]
      sociology_weapons: ["Parallel comparison (everyone does this)", "Deep in-group signal"]
      emotion_primary: "empathy"
      emotion_secondary: "fear"
      keywords_in_title: ["程序员", "Plan B", "月入3万"]
      why_different: "Cover: Deep mirror effect (痴 category). Title: Solution-oriented with income anchor."

    - pair: 3
      cover_text: "「35岁中年危机」是个谎言"
      cover_text_chars: 12
      content_title: "35岁危机真相：被淘汰的不是年龄 是这3种思维"
      content_title_chars: 20
      philosophy_weapons: ["Foucault (challenges existing discourse)", "Nietzsche (absolute assertion)"]
      psychology_weapons: ["Outrage + Curiosity", "Rebel archetype", "Framing effect bias"]
      communication_weapons: ["Not A it's B structure", "Insight social currency"]
      sociology_weapons: ["Symbolic interaction (redefines '35岁危机')", "High cultural capital"]
      emotion_primary: "outrage"
      emotion_secondary: "curiosity"
      keywords_in_title: ["35岁危机", "真相", "思维"]
      why_different: "Cover: Discourse disruption (嗔 category). Title: Reframe + actionable diagnosis."
```

### Step 5: Quality Check — 4D Verification

Every candidate must pass the 4D checklist:

```
FOR each candidate pair:
  # Platform compliance
  CHECK cover_text_chars <= platform.cover_text_limit
  CHECK content_title_chars <= platform.content_title_limit
  CHECK cover_text readable at thumbnail size

  # Differentiation (MANDATORY)
  CHECK cover_text != content_title
  CHECK cover_text language_game != content_title language_game

  # Philosophy dimension
  CHECK cover_text has concrete intentionality anchor (not abstract)
  CHECK at least one philosophical weapon deployed

  # Psychology dimension
  CHECK cover_text triggers identifiable emotion (high arousal preferred)
  CHECK emotion combination is viral-capable (arousal + social proof)
  CHECK cognitive bias is actively deployed (not accidental)

  # Communication dimension
  CHECK content_title contains target SEO keywords
  CHECK title uses identifiable golden sentence structure
  CHECK social currency type is clear

  # Sociology dimension
  CHECK target in-group is identifiable
  CHECK cultural capital level matches platform

  IF any check fails: regenerate with explicit 4D constraints
```

### Step 6: Present Results

Output format for each platform:

```markdown
## 📱 [Platform Name]

### Pair 1 ⭐ (Recommended)
| Type | Text | Chars |
|------|------|-------|
| 🎨 **Cover Text** | [text] | XX/YY |
| 📝 **Content Title** | [text] | XX/YY |

**4D Breakdown**:
- 🧠 Philosophy: [weapons used]
- 💡 Psychology: [emotion combo] + [archetype] + [bias]
- 📢 Communication: [frame] + [sentence structure] + [social currency]
- 👥 Sociology: [in-group] + [comparison] + [cultural capital level]

**差异策略**: [why cover text and content title play different language games]

### Pair 2
...

### Pair 3
...
```

### Step 7: User Selection

**⏸️ WAIT for user to select preferred pair for each platform.**

User can:
- Select a pair: "YouTube 用第 2 组"
- Mix and match: "YouTube 封面用第 1 组，标题用第 3 组"
- Request regeneration: "YouTube 再生成几组，要更有冲击力的"
- Request specific 4D weapon: "再来一组用 Foucault 新概念的"
- Edit manually: "YouTube 封面改成 'xxx'"

### Step 7: Cover Image Generation (Optional)

If `--cover-image` is specified OR user requests it after seeing text results:

For each platform where cover image is needed:

1. Take the selected cover text
2. Determine the correct aspect ratio for the platform:

```yaml
cover_image_ratios:
  youtube: "16:9"
  xhs: "3:4"
  wechat-video: "16:9"   # or 3:4 for vertical video
  x: "16:9"
  facebook: "16:9"
  instagram: "9:16"      # Reels
  tiktok: "9:16"
  douyin: "9:16"
```

3. Invoke `/baoyu-cover-image` with the selected cover text and appropriate style

> **Note**: `/baoyu-cover-image` currently generates 2.35:1 (WeChat article) format.
> For other aspect ratios, generate the image prompt manually with the correct dimensions
> and use the Gemini image generation API directly.

```
调用 /baoyu-cover-image {article_path_or_topic}
  --style {user_style or auto-selected}

# For non-2.35:1 ratios, generate custom prompts with correct dimensions
```

### Step 8: Output Summary

```markdown
## ✅ Cover Title Generation Complete

| Platform | Cover Text | Content Title | Cover Image |
|----------|-----------|---------------|-------------|
| YouTube | "xxx" | "xxx" | ✅ / ❌ |
| 小红书 | "xxx" | "xxx" | ✅ / ❌ |
| ... | ... | ... | ... |

所有生成结果直接输出在对话中。
```

---

## Output Format

生成的标题和封面文案以结构化格式输出在对话中：

```yaml
# Auto-generated by /cover-title skill
# Topic: {topic}
# Generated: {date}

platforms:
  youtube:
    language: en
    cover_text: "Selected cover text"
    content_title: "Selected content title"
    emotion: curiosity
    keywords: [keyword1, keyword2]
    cover_image: cover-youtube.png  # if generated

  xhs:
    language: zh
    cover_text: "选中的封面文案"
    content_title: "选中的内容标题"
    emotion: desire
    keywords: [关键词1, 关键词2]
    cover_image: cover-xhs.png

  # ... other platforms
```

---

## Integration with Article Pipeline

This skill can be invoked standalone OR as part of the article pipeline:

### Standalone Usage
```
/cover-title "我的主题" --platforms xhs,douyin --cover-image
```

### Within Article Pipeline (Phase 4 enhancement)

After Phase 3 (Finalization), the article pipeline can invoke:

```
/cover-title {article_path}/index.md --platforms {target_platforms} --cover-image --brand {brand}
```

This replaces the simple cover generation in Phase 4 with optimized, platform-specific cover text + images.

---

## Advanced: A/B Testing Suggestions

When generating candidates, also output A/B testing recommendations:

```markdown
### 🧪 A/B Testing Suggestion

**YouTube**: Test Pair 1 (curiosity) vs Pair 3 (hope) — these target different audience segments.
Upload both thumbnails and let YouTube auto-optimize via "Test & Compare" feature.

**小红书**: Test Pair 1 (数字型) vs Pair 2 (反问型) — publish at same time on different days.
Track 24h engagement rate to determine winner.
```

---

## Notes

1. **Cover text ≠ Content title**: This is the #1 rule. Never generate identical text for both.
2. **Emotion first for covers**: Cover text should trigger an immediate emotional response. Rational/informational approach is for content titles.
3. **Keywords first for titles**: Content titles serve dual purpose — human readability + algorithm discoverability.
4. **Platform-native language**: Respect each platform's cultural norms. XHS is playful and emoji-rich. LinkedIn is professional. Douyin is direct and punchy.
5. **Character limits are hard rules**: Never exceed platform limits. Always show char count alongside generated text.
6. **Test at thumbnail size**: Cover text must be readable when the image is displayed at feed-scroll size (~120px height for YouTube, grid size for TikTok/Douyin).
