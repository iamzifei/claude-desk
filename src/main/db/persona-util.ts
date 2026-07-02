/**
 * Persona five-dimension (人设五维) pure helpers — no Electron/DB imports so
 * everything here is unit-testable under plain Node.
 *
 * The methodology comes from the persona-builder skill (人设五维): a persona
 * becomes "solid" when all five dimensions accumulate real material over
 * time, and every single piece of content targets exactly ONE dimension.
 *
 * Cross-app contract: the dimension keys, guided copy, JSON import/export
 * field names and the "## 当前人设" prompt section are deliberately aligned
 * with lingxi (the cloud sibling app, see its src/lib/brands.ts and
 * src/lib/prompts/builder.ts) so persona files round-trip between both apps.
 */

export type PersonaDimensionKey = 'past' | 'expertise' | 'stance' | 'proof' | 'life'

export interface PersonaDimensionMeta {
  key: PersonaDimensionKey
  /** Section title, e.g. 过去（故事）. */
  label: string
  /** What this dimension does for the audience. */
  effect: string
  /** Guided question shown above the textarea. */
  question: string
  /** Empty-state hint / textarea placeholder distilled from the skill. */
  placeholder: string
}

/**
 * Metadata for the guided five-dimension questionnaire. Order matters — it is
 * the canonical order for both the form sections and prompt injection. The
 * copy is kept character-identical with lingxi's PERSONA_DIMENSIONS so both
 * apps speak the same language.
 */
export const PERSONA_DIMENSIONS: PersonaDimensionMeta[] = [
  {
    key: 'past',
    label: '过去（故事）',
    effect: '让人共情你、记住你',
    question: '你走到今天这一行，最大的一次转折是什么？有没有一段特别难的日子？',
    placeholder:
      '讲一段你的经历/转折——立可信度用。每行一条，写成有画面/数字的事实句，例如：开馆第一年只有 7 个会员，靠白天送外卖撑房租'
  },
  {
    key: 'expertise',
    label: '专业（干货）',
    effect: '让人觉得你有用',
    question: '你能教会一个完全外行的人做什么？同行里你比多数人做得好的一件事是什么？',
    placeholder:
      '写你的垂直领域本事——证明有用。每行一条，例如：能让完全没运动过的中年人 4 周建立每天 20 分钟的锻炼习惯'
  },
  {
    key: 'stance',
    label: '观点态度',
    effect: '让人认同你、站队你',
    question: '行业里哪个流行说法你最反对？有没有大家都在做但你坚决不做的事？',
    placeholder: '写你的立场和好恶——让人站队用。每行一条，例如：反对健身房年卡套路——我只卖月卡'
  },
  {
    key: 'proof',
    label: '结果实力',
    effect: '让人信你',
    question: '有什么可展示的成果（作品/数据/案例/年限）？你帮别人拿到过的最好结果是什么？',
    placeholder:
      '论证实力用事实，不用形容词。每行一条，例如：带过 200+ 名 40 岁以上会员，最年长 71 岁'
  },
  {
    key: 'life',
    label: '生活（温度）',
    effect: '让人觉得你是活人，有温度',
    question: '工作之外，你的日常里有什么反复出现的场景？有没有「不体面但真实」的细节愿意公开？',
    placeholder:
      '写真实的日常——温度来源。每行一条，例如：每天早上 6 点在人民公园免费带晨练，风雨无阻第 3 年'
  }
]

/** Default publishing-ratio suggestion from the persona-builder skill. */
export const DEFAULT_CONTENT_CALENDAR: Record<PersonaDimensionKey, string> = {
  expertise: '每周1',
  stance: '每周1',
  past: '每月1-2',
  proof: '每月1-2',
  life: '不定期'
}

export type PersonaDimensions = Record<PersonaDimensionKey, string[]>

/** The editable payload of a persona (id/timestamps live on the DB row). */
export interface PersonaData {
  name: string
  /** 一句话定位: 身份 ×（人群或细分）× 差异点 */
  positioning: string
  /** Tone knobs, same vocabulary as lingxi's tone config. */
  toneFormality: string // 正式程度: 轻松 / 半正式 / 正式
  toneExpertise: string // 专业程度: 科普向 / 专业易懂 / 深度专业
  tonePerson: string // 人称: 我 / 我们
  targetPlatforms: string[]
  bannedWords: string[]
  dimensions: PersonaDimensions
  /** Publishing-ratio suggestion keyed by dimension, e.g. { expertise: "每周1" }. */
  contentCalendar: Record<string, string>
}

/** A full persona as stored/hydrated from the local DB. */
export interface Persona extends PersonaData {
  id: string
  is_default: number // 0 | 1 — the default persona injects into every conversation
  project_id: string | null
  created_at: number
  updated_at: number
}

/** Raw SQLite row shape (arrays/objects serialized as JSON text columns). */
export interface PersonaRow {
  id: string
  name: string
  positioning: string | null
  tone_formality: string | null
  tone_expertise: string | null
  tone_person: string | null
  target_platforms: string | null
  banned_words: string | null
  past: string | null
  expertise: string | null
  stance: string | null
  proof: string | null
  life: string | null
  content_calendar: string | null
  is_default: number
  project_id: string | null
  created_at: number
  updated_at: number
}

/**
 * Defensively coerce an unknown value into a clean string array: accepts a
 * real array or a JSON-encoded array string; keeps non-empty trimmed strings
 * only. Anything else (garbage JSON, objects, numbers) yields [].
 */
export function toStringArray(v: unknown): string[] {
  let arr: unknown = v
  if (typeof v === 'string') {
    if (!v.trim()) return []
    try {
      arr = JSON.parse(v)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
}

/** Defensively coerce an unknown value into a string→string record. */
export function toStringRecord(v: unknown): Record<string, string> {
  let obj: unknown = v
  if (typeof v === 'string') {
    if (!v.trim()) return {}
    try {
      obj = JSON.parse(v)
    } catch {
      return {}
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) out[k] = val.trim()
  }
  return out
}

/** Split a textarea value into material points: one per line, trimmed, empties dropped. */
export function parseMaterialInput(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Hydrate a raw SQLite row into a Persona with parsed arrays/records. */
export function rowToPersona(row: PersonaRow): Persona {
  return {
    id: row.id,
    name: row.name,
    positioning: row.positioning ?? '',
    toneFormality: row.tone_formality ?? '半正式',
    toneExpertise: row.tone_expertise ?? '专业易懂',
    tonePerson: row.tone_person ?? '我',
    targetPlatforms: toStringArray(row.target_platforms),
    bannedWords: toStringArray(row.banned_words),
    dimensions: {
      past: toStringArray(row.past),
      expertise: toStringArray(row.expertise),
      stance: toStringArray(row.stance),
      proof: toStringArray(row.proof),
      life: toStringArray(row.life)
    },
    contentCalendar: toStringRecord(row.content_calendar),
    is_default: row.is_default ? 1 : 0,
    project_id: row.project_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

/** Serialize the editable payload back into JSON-text column values. */
export function personaToColumns(
  d: PersonaData
): Pick<
  PersonaRow,
  | 'name'
  | 'positioning'
  | 'tone_formality'
  | 'tone_expertise'
  | 'tone_person'
  | 'target_platforms'
  | 'banned_words'
  | 'past'
  | 'expertise'
  | 'stance'
  | 'proof'
  | 'life'
  | 'content_calendar'
> {
  return {
    name: d.name.trim() || '未命名人设',
    positioning: d.positioning.trim() || null,
    tone_formality: d.toneFormality.trim() || null,
    tone_expertise: d.toneExpertise.trim() || null,
    tone_person: d.tonePerson.trim() || null,
    target_platforms: JSON.stringify(toStringArray(d.targetPlatforms)),
    banned_words: JSON.stringify(toStringArray(d.bannedWords)),
    past: JSON.stringify(toStringArray(d.dimensions.past)),
    expertise: JSON.stringify(toStringArray(d.dimensions.expertise)),
    stance: JSON.stringify(toStringArray(d.dimensions.stance)),
    proof: JSON.stringify(toStringArray(d.dimensions.proof)),
    life: JSON.stringify(toStringArray(d.dimensions.life)),
    content_calendar: JSON.stringify(toStringRecord(d.contentCalendar))
  }
}

/** How many of the five dimensions have at least one material point. */
export function countFilledDimensions(dims: PersonaDimensions): number {
  return PERSONA_DIMENSIONS.filter((m) => dims[m.key].length > 0).length
}

/**
 * Build the "## 当前人设" system-prompt section for one persona. The layout
 * mirrors lingxi's buildBrandPrompt (src/lib/prompts/builder.ts) so both apps
 * inject identically-shaped context:
 *
 *   ## 当前人设: {name}
 *   一句话定位 / 语言风格 / 目标平台 / 禁用词 lines (only when present)
 *   ### 人设五维素材
 *   **{维度}**（{作用}）: bullet list, empty dimensions skipped
 *   **内容日历配比** + the one-dimension-per-piece 创作指令
 */
export function buildPersonaSystemPrompt(p: PersonaData): string {
  const lines: string[] = [`## 当前人设: ${p.name}`]

  if (p.positioning.trim()) lines.push(`一句话定位: ${p.positioning.trim()}`)
  lines.push(
    `语言风格: 正式程度=${p.toneFormality || '半正式'}, 专业程度=${p.toneExpertise || '专业易懂'}, 人称=${p.tonePerson || '我'}`
  )
  if (p.bannedWords.length) lines.push(`禁用词: ${p.bannedWords.join(', ')}`)
  if (p.targetPlatforms.length) lines.push(`目标平台: ${p.targetPlatforms.join(', ')}`)

  // Five-dimension material block — skipped entirely when nothing is filled,
  // so a bare-bones persona still produces a valid minimal prompt.
  if (countFilledDimensions(p.dimensions) > 0) {
    lines.push('')
    lines.push('### 人设五维素材')
    lines.push(
      '以下是该创作者的真实素材，按人设五维组织。写作时引用这些事实句来支撑口吻、立场和可信度，不得编造或夸大素材之外的经历。'
    )
    for (const meta of PERSONA_DIMENSIONS) {
      const points = p.dimensions[meta.key]
      if (points.length === 0) continue // empty dimension → skip
      lines.push('')
      lines.push(`**${meta.label}**（${meta.effect}）:`)
      for (const point of points) lines.push(`- ${point}`)
    }

    const entries = PERSONA_DIMENSIONS.filter((meta) => p.contentCalendar[meta.key]).map(
      (meta) => `${meta.label}=${p.contentCalendar[meta.key]}`
    )
    if (entries.length > 0) {
      lines.push('')
      lines.push(`**内容日历配比**: ${entries.join(', ')}`)
    }

    lines.push('')
    lines.push(
      '**创作指令**: 每篇内容应明确指向五维中的某一维（在策略 Brief 的人设维度标注中注明指向哪一维），一条内容只打一维，不贪多——立体人设靠日积月累，不靠一篇讲完。'
    )
  }

  return lines.join('\n')
}

/**
 * Portable JSON export format — field names match lingxi's persona fields
 * (past/expertise/stance/proof/life/contentCalendar + base fields) so a file
 * exported here imports cleanly there and vice versa.
 */
export interface PersonaJson {
  version: 1
  name: string
  positioning: string
  tone: { formality: string; expertise: string; person: string }
  targetPlatforms: string[]
  bannedWords: string[]
  past: string[]
  expertise: string[]
  stance: string[]
  proof: string[]
  life: string[]
  contentCalendar: Record<string, string>
  isDefault: boolean
}

/** Serialize a persona for file export (pretty-printed, cross-app schema). */
export function personaToJson(p: Persona): string {
  const out: PersonaJson = {
    version: 1,
    name: p.name,
    positioning: p.positioning,
    tone: { formality: p.toneFormality, expertise: p.toneExpertise, person: p.tonePerson },
    targetPlatforms: p.targetPlatforms,
    bannedWords: p.bannedWords,
    past: p.dimensions.past,
    expertise: p.dimensions.expertise,
    stance: p.dimensions.stance,
    proof: p.dimensions.proof,
    life: p.dimensions.life,
    contentCalendar: p.contentCalendar,
    isDefault: p.is_default === 1
  }
  return JSON.stringify(out, null, 2)
}

/**
 * Defensively parse an imported persona JSON file. Every field is optional
 * and individually coerced — a partially-valid file still yields a usable
 * persona; a file that is not a JSON object (or has no name and no content
 * at all) yields null.
 */
export function parsePersonaJson(text: string): PersonaData | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const tone =
    o.tone && typeof o.tone === 'object' && !Array.isArray(o.tone)
      ? (o.tone as Record<string, unknown>)
      : {}
  const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v.trim() : fallback)

  const data: PersonaData = {
    name: str(o.name),
    positioning: str(o.positioning),
    toneFormality: str(tone.formality, '半正式') || '半正式',
    toneExpertise: str(tone.expertise, '专业易懂') || '专业易懂',
    tonePerson: str(tone.person, '我') || '我',
    targetPlatforms: toStringArray(o.targetPlatforms),
    bannedWords: toStringArray(o.bannedWords),
    dimensions: {
      past: toStringArray(o.past),
      expertise: toStringArray(o.expertise),
      stance: toStringArray(o.stance),
      proof: toStringArray(o.proof),
      life: toStringArray(o.life)
    },
    contentCalendar: toStringRecord(o.contentCalendar)
  }

  // Reject files that carry neither an identity nor any material — those are
  // almost certainly not persona exports.
  const hasContent = data.name || data.positioning || countFilledDimensions(data.dimensions) > 0
  if (!hasContent) return null
  if (!data.name) data.name = '导入的人设'
  return data
}
