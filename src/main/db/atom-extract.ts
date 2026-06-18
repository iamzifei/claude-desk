/**
 * 知识原子提取 (atom extraction). Pure & dependency-free so the prompt
 * construction and the model-output parsing are unit-tested without the SDK.
 *
 * An "atom" is the smallest reusable unit of content — an opinion, a quotable
 * line, a data point, a case, a hook, or a method. Atoms are the currency that
 * topic-assembly and creation draw from (dontbesilent's 知识原子 / Obsidian's
 * atomic notes).
 */
export const ATOM_TYPES = ['观点', '金句', '数据', '案例', '钩子', '方法'] as const
export type AtomType = (typeof ATOM_TYPES)[number]

export interface ExtractedAtom {
  content: string
  type: AtomType
  tags?: string
}

/** Build the {system, prompt} pair that asks the model to split text into atoms. */
export function buildAtomExtractPrompt(source: string): { system: string; prompt: string } {
  const system =
    '你是内容资产管理助手。把用户给的素材拆成若干「知识原子」——可独立复用的最小内容单元。' +
    '每个原子归类为以下之一:观点 / 金句 / 数据 / 案例 / 钩子 / 方法。' +
    '只保留有复用价值的、自包含的片段(去掉过渡句和废话);宁缺毋滥。\n\n' +
    '只输出一个 JSON 数组,每个元素形如 {"content":"原子正文","type":"观点","tags":"逗号分隔标签(可选)"}。' +
    '不要输出任何解释或 markdown 代码块标记以外的内容。'
  const prompt = `请把下面的素材拆成知识原子:\n\n${source}`
  return { system, prompt }
}

/**
 * Parse the model's response into validated atoms. Tolerant of ```json fences
 * and stray prose around the array. Invalid items are dropped; unknown types
 * fall back to 观点. Pure.
 */
export function parseAtoms(raw: string, maxAtoms = 40): ExtractedAtom[] {
  const json = extractJsonArray(raw)
  if (!json) return []
  let arr: unknown
  try {
    arr = JSON.parse(json)
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []
  const out: ExtractedAtom[] = []
  for (const item of arr) {
    if (out.length >= maxAtoms) break
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const content = typeof rec.content === 'string' ? rec.content.trim() : ''
    if (!content) continue
    const type = (ATOM_TYPES as readonly string[]).includes(rec.type as string)
      ? (rec.type as AtomType)
      : '观点'
    const tags = typeof rec.tags === 'string' && rec.tags.trim() ? rec.tags.trim() : undefined
    out.push({ content, type, tags })
  }
  return out
}

/** Pull the first top-level JSON array substring out of a noisy string. */
function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return null
  return raw.slice(start, end + 1)
}
