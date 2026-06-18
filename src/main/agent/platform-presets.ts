/**
 * Platform style presets for the 一键多平台改写 (one-click multi-platform rewrite)
 * feature and for tagging materials by platform. Pure & dependency-free so it
 * can be unit-tested and reused on both main and renderer sides.
 *
 * Each platform carries the channel's voice, length, and formatting habits so a
 * single source idea can be re-spun into native-feeling copy per channel.
 */
export interface Platform {
  id: string
  label: string
  /** One-line description shown in the picker. */
  hint: string
  /** Channel-specific instructions appended to the rewrite system prompt. */
  guide: string
}

export const PLATFORMS: Platform[] = [
  {
    id: 'xiaohongshu',
    label: '小红书',
    hint: '种草口吻 · emoji · 话题标签',
    guide:
      '小红书笔记风格:第一人称、真诚种草口吻;开头一句抓人的痛点或好处;正文短句分段、可适度使用 emoji;' +
      '结尾给 3-6 个 #话题标签。标题口语化、带情绪或数字,控制在 20 字内。全文 200-500 字。'
  },
  {
    id: 'gongzhonghao',
    label: '公众号',
    hint: '深度图文 · 有逻辑 · 有标题',
    guide:
      '微信公众号文章风格:有信息量、有逻辑层次;用小标题分段(可用「一、二、三」或加粗短句);' +
      '开头用一个场景或观点引入,中间展开论证或步骤,结尾给总结或行动建议。语气专业但不端着。800-1500 字。'
  },
  {
    id: 'douyin',
    label: '抖音脚本',
    hint: '口播脚本 · 强钩子 · 分镜',
    guide:
      '抖音短视频口播脚本:开头 3 秒强钩子(提问 / 反常识 / 痛点);中间用口语化短句讲清 1 个核心点;' +
      '可按「镜头/口播」分行标注节奏;结尾给行动号召(关注 / 评论 / 点赞)。总时长 30-60 秒,约 150-300 字。'
  },
  {
    id: 'shipinhao',
    label: '视频号',
    hint: '微信生态 · 温和 · 标题党克制',
    guide:
      '微信视频号文案:面向更广年龄层、语气温和真实;标题克制不夸张;正文讲清价值点,适合配口播或图文。' +
      '弱化网络梗,强调实用与共鸣。100-300 字。'
  },
  {
    id: 'x',
    label: 'X / 推特',
    hint: '英文 · 简短 · thread',
    guide:
      'Rewrite as an English X (Twitter) post or short thread. Punchy, concise, one idea per line. ' +
      'Lead with a hook. Use line breaks for rhythm. If it needs more than ~280 chars, split into a numbered thread (1/ 2/ …).'
  }
]

export function platformById(id: string): Platform | undefined {
  return PLATFORMS.find((p) => p.id === id)
}

/**
 * Build the rewrite messages for one platform. Returns a {system, prompt} pair
 * the caller feeds to the chat engine. Pure.
 */
export function buildRewritePrompt(
  platform: Platform,
  source: string,
  extraContext?: string
): { system: string; prompt: string } {
  const system =
    '你是资深的多平台内容创作助手。你的任务是把用户给的原始内容,改写成目标平台的母语化文案,' +
    '保留原意与关键信息,但用该平台读者习惯的语气、结构和长度。只输出改写后的成品,不要解释、不要加前后缀。\n\n' +
    `目标平台:${platform.label}\n要求:${platform.guide}` +
    (extraContext ? `\n\n可参考的素材/背景:\n${extraContext}` : '')
  const prompt = `请把以下原始内容改写为「${platform.label}」平台的文案:\n\n${source}`
  return { system, prompt }
}
