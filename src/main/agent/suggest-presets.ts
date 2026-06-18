/**
 * 数据驱动选题 (data-driven topic suggestions). Pure prompt + parsing so the
 * engagement scoring and model-output handling are unit-tested. Closes the
 * dontbesilent flywheel: 发布数据 → 反哺下一轮选题.
 */
export interface PubLike {
  title: string
  platform: string | null
  views: number
  likes: number
  comments: number
  saves: number
}

export interface TopicSuggestion {
  title: string
  angle?: string
}

/** Engagement score weighting saves/comments above raw likes (content value). */
export function engagementScore(p: PubLike): number {
  return p.likes + p.comments * 2 + p.saves * 3
}

/** Format publications (best-performing first) into a compact summary block. */
export function formatPublicationsSummary(pubs: PubLike[]): string {
  return [...pubs]
    .sort((a, b) => engagementScore(b) - engagementScore(a))
    .slice(0, 20)
    .map(
      (p) =>
        `「${p.title}」${p.platform ? `(${p.platform})` : ''} 播放${p.views} 赞${p.likes} 评${p.comments} 藏${p.saves}`
    )
    .join('\n')
}

export function buildSuggestPrompt(summary: string, n = 8): { system: string; prompt: string } {
  const system =
    '你是内容增长操盘手。根据创作者过往的发布数据,分析哪些选题/角度/平台表现更好(尤其看收藏、评论这类深度互动),' +
    `然后给出 ${n} 个值得做的下一轮选题。\n` +
    '每个选题给:标题(具体、有钩子)+ 切入角度(一句话)。复用表现好的结构,别重复已发过的。\n' +
    '只输出一个 JSON 数组,元素形如 {"title":"选题标题","angle":"切入角度"}。不要任何额外解释或代码块标记以外的内容。'
  const prompt = `这是我过往的发布数据(按表现从高到低):\n\n${summary}\n\n请据此给出下一轮选题。`
  return { system, prompt }
}

/** Parse the model's JSON array of suggestions; tolerant of fences/prose. */
export function parseTopicSuggestions(raw: string, max = 20): TopicSuggestion[] {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return []
  let arr: unknown
  try {
    arr = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []
  const out: TopicSuggestion[] = []
  for (const item of arr) {
    if (out.length >= max) break
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const title = typeof rec.title === 'string' ? rec.title.trim() : ''
    if (!title) continue
    const angle = typeof rec.angle === 'string' && rec.angle.trim() ? rec.angle.trim() : undefined
    out.push({ title, angle })
  }
  return out
}
