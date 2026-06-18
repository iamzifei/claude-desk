/**
 * 选题装配 (topic assembly) prompts. Pure & dependency-free so the context
 * formatting + prompt shaping are unit-tested. This is the core of the
 * dontbesilent pipeline: a draft is *assembled* from the creator's own assets
 * (atoms / materials) rather than written from zero.
 */
export interface AssemblyItem {
  kind: string // '原子' | '素材'
  title: string
  content: string
}

export interface AssemblyTopic {
  title: string
  angle?: string | null
  platform?: string | null
}

/** Format retrieved assets into a numbered context block. Pure. */
export function formatAssemblyContext(items: AssemblyItem[]): string {
  if (items.length === 0) return '(没有检索到相关素材，请基于选题直接撰写)'
  return items
    .map((it, i) => `${i + 1}. 【${it.kind}】${it.title ? it.title + '：' : ''}${it.content}`)
    .join('\n')
}

/** Build the {system, prompt} pair for assembling a draft from a topic + assets. */
export function buildAssemblyPrompt(
  topic: AssemblyTopic,
  context: string
): { system: string; prompt: string } {
  const system =
    '你是资深内容操盘手。任务:把创作者自己的「资产」装配成一篇结构完整的初稿——' +
    '开头有钩子、主体有逻辑、结尾有收束或行动号召。\n' +
    '尽量复用下面提供的素材/原子里的事实、观点、金句、案例、数据,不要泛泛而谈、不要编造不存在的细节。' +
    '只输出初稿正文,不要解释、不要列出你用了哪些素材。'
  const topicLine =
    `【选题】${topic.title}` +
    (topic.angle ? `\n【切入角度】${topic.angle}` : '') +
    (topic.platform ? `\n【目标平台】${topic.platform}` : '')
  const prompt = `请基于以下选题和可用资产,装配一篇初稿:\n\n${topicLine}\n\n【可用素材 / 原子】\n${context}`
  return { system, prompt }
}
