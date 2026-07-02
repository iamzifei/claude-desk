---
name: baoyu-cover-image
description: 为文章生成精美封面图。分析文章内容，自动创建多种风格的手绘风封面图片。
---

# Cover Image Generator

Generate hand-drawn style cover images for articles with multiple style options.

## Trigger Phrases

- `/baoyu-cover-image`
- "generate cover image"
- "create article cover"
- "make a cover"
- "生成封面图"
- "封面配图"

## Style Gallery

| Style | Description |
|-------|-------------|
| `elegant` (Default) | Refined, sophisticated, understated |
| `tech` | Modern, clean, futuristic |
| `warm` | Friendly, approachable, human-centered |
| `bold` | High contrast, attention-grabbing, energetic |
| `minimal` | Ultra-clean, zen-like, focused |
| `playful` | Fun, creative, whimsical |
| `nature` | Organic, calm, earthy |
| `retro` | Vintage, nostalgic, classic |

## Auto Style Selection

When no style is specified, analyze content to select the best style:

| Content Signals | Selected Style |
|----------------|----------------|
| AI, coding, tech, digital, algorithm | `tech` |
| Personal story, emotion, growth, life | `warm` |
| Controversial, urgent, must-read, warning | `bold` |
| Simple, zen, focus, essential | `minimal` |
| Fun, easy, beginner, casual, tutorial | `playful` |
| Nature, eco, wellness, health, organic | `nature` |
| History, classic, vintage, old, traditional | `retro` |
| Business, professional, strategy, analysis | `elegant` |

## Style Definitions

### elegant
Refined, sophisticated, understated
- **Colors**: Primary: Soft coral (#E8A598), muted teal (#5B8A8A), dusty rose (#D4A5A5). Background: Warm cream (#F5F0E6), soft beige. Accents: Gold (#C9A962), copper.
- **Visual Elements**: Delicate lines, refined icons, subtle gradients, balanced composition
- **Typography**: Elegant serif-style hand lettering
- **Best For**: Professional content, thought leadership, business topics

### tech
Modern, clean, futuristic
- **Colors**: Primary: Deep blue (#1A365D), electric cyan (#00D4FF), purple (#6B46C1). Background: Dark gray (#1A202C), near-black (#0D1117). Accents: Neon green (#00FF88), bright white.
- **Visual Elements**: Circuit patterns, data nodes, geometric grids, code snippets, glowing effects
- **Typography**: Monospace-style hand lettering, glowing effects
- **Best For**: AI, programming, technology, digital transformation

### warm
Friendly, approachable, human-centered
- **Colors**: Primary: Warm orange (#ED8936), golden yellow (#F6AD55), terracotta (#C05621). Background: Cream (#FFFAF0), soft peach (#FED7AA). Accents: Deep brown (#744210), soft red.
- **Visual Elements**: Rounded shapes, smiling faces, sun rays, hearts, warm lighting
- **Typography**: Friendly rounded hand lettering
- **Best For**: Personal growth, lifestyle, education, human stories

### bold
High contrast, attention-grabbing, energetic
- **Colors**: Primary: Vibrant red (#E53E3E), bright orange (#DD6B20), electric yellow (#F6E05E). Background: Deep black (#000000), dark charcoal. Accents: White, neon highlights.
- **Visual Elements**: Exclamation marks, lightning bolts, arrows, strong shapes, dramatic compositions
- **Typography**: Bold, impactful, large hand lettering with shadows
- **Best For**: Opinion pieces, controversial takes, urgent topics

### minimal
Ultra-clean, zen-like, focused
- **Colors**: Primary: Pure black (#000000), white (#FFFFFF). Background: White or off-white (#FAFAFA). Accents: Single color (content-derived).
- **Visual Elements**: Single focal point, maximum negative space, thin lines
- **Typography**: Clean, simple hand lettering, lots of breathing room
- **Best For**: Philosophy, minimalism, focused concepts

### playful
Fun, creative, whimsical
- **Colors**: Primary: Pastel pink (#FED7E2), mint (#C6F6D5), lavender (#E9D8FD), sky blue (#BEE3F8). Background: Light cream (#FFFBEB), soft white. Accents: Bright pops - yellow, coral, turquoise.
- **Visual Elements**: Doodles, stars, swirls, cute characters, emoji-style icons, playful compositions
- **Typography**: Bouncy, irregular hand lettering, playful angles
- **Best For**: Casual content, tutorials, beginner guides, fun topics

### nature
Organic, calm, earthy
- **Colors**: Primary: Forest green (#276749), sage (#9AE6B4), earth brown (#744210). Background: Sand beige (#F5E6D3), sky blue (#E0F2FE). Accents: Sunset orange, water blue.
- **Visual Elements**: Leaves, trees, mountains, sun, clouds, organic flowing lines
- **Typography**: Organic, flowing hand lettering with natural textures
- **Best For**: Sustainability, wellness, outdoor topics, slow living

### retro
Vintage, nostalgic, classic
- **Colors**: Primary: Muted orange (#ED8936 at 70%), dusty pink (#FED7E2 at 80%), faded teal. Background: Aged paper (#F5E6D3), sepia tones. Accents: Faded red, vintage gold.
- **Visual Elements**: Halftone dots, vintage badges, classic icons, aged textures
- **Typography**: Vintage-style hand lettering, classic serif influence
- **Best For**: History, retrospectives, classic topics, throwback content

## Base Image Prompt Template

When generating a cover image, construct the prompt following this template:

```
Create a cover image following these guidelines:

- Type: Cover image / Hero image
- Aspect Ratio: [platform-specific, default 2.35:1 for WeChat]
- Style: Hand-drawn illustration

Core Principles:
- Hand-drawn quality throughout — NO realistic or photographic elements
- If content involves sensitive or copyrighted figures, create stylistically similar alternatives
- Ample whitespace, highlight core message, avoid cluttered layouts
- Main visual elements centered or slightly left (leave right side for title area if title included)

Text Style (When Title Included):
- ALL text MUST be hand-drawn style
- Title text: Large, eye-catching, max 8 characters
- May include 1 line of subtitle or keyword tags
- Font style harmonizes with illustration style
- DO NOT use realistic or computer-generated fonts

Language:
- Use the same language as the content provided
- Match punctuation style to the content language
```

## Workflow

### Step 1: Analyze Content
Extract: Main topic, core message, tone, style-signaling keywords.

### Step 2: Select Style
If style specified, use it. Otherwise auto-select from content signals. Default to `elegant`.

### Step 3: Generate Cover Concept
- **Title** (if included, max 8 characters): Distill core message into a punchy headline
- **Visual Elements**: Style-appropriate imagery, 1-2 symbolic elements

### Step 4: Build Image Prompt
Combine the base prompt template with selected style definition and content details.

### Step 5: Generate Image
Request image generation with the constructed prompt.

## Platform Aspect Ratios

| Platform | Aspect Ratio | Dimensions |
|----------|-------------|------------|
| WeChat article | 2.35:1 | 900x383 |
| YouTube | 16:9 | 1280x720 |
| Xiaohongshu | 3:4 | 1242x1660 |
| X (Twitter) | 16:9 | 1200x675 |
| Instagram Reels | 9:16 | 1080x1920 |
| TikTok / Douyin | 9:16 | 1080x1920 |

## Notes

- Cover should be instantly understandable at small preview sizes
- Title (if included) must be readable and impactful
- Visual metaphors work better than literal representations
- Maintain style consistency throughout the cover
- Title text language should match content language
