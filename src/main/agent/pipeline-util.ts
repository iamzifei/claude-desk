/**
 * Creation pipeline — pure domain logic (no Electron, no DB).
 *
 * The 7-phase guided creation flow (选题 → 策略 → 写作 → 去AI味 → 配图 → 排版
 * → 复盘) mirrors lingxi's pipeline, grouped to seven coarse phases; each phase
 * is one conversation turn against a shared phase prompt (creator-skills/
 * pipeline, bundled under resources/pipeline). This module holds:
 *
 *   - phase metadata (ids, keys, labels, prompt file names)
 *   - the phase-status state machine (run / done / rerun→downstream stale)
 *   - system-prompt assembly ({persona} / {previous_outputs} / {format}
 *     placeholder injection, with an append fallback when a template lacks
 *     a placeholder)
 *
 * Everything here is deliberately side-effect-free so tests/pipeline.test.ts
 * can exercise the full state machine without booting Electron. Persistence
 * lives in db/creations.ts; streaming execution in agent/pipeline.ts.
 */

export type CreationFormat = 'article' | 'script'

export type PhaseStatus = 'pending' | 'running' | 'done' | 'error' | 'stale' | 'skipped'

/** Per-phase persisted state (one entry per phase id inside `phase_outputs`). */
export interface PhaseState {
  status: PhaseStatus
  /** The assistant's full markdown output for this phase ('' until done). */
  output: string
  /** The user's input for this phase (topic direction, retro data, notes…). */
  input: string
  /** Last error message when status === 'error'. */
  error?: string
  updated_at: number
}

/** phase id (1-based) → state. Stored as JSON in creations.phase_outputs. */
export type PhaseOutputs = Record<number, PhaseState>

export interface PhaseMeta {
  id: number
  /** Stable english key (matches the prompt file `phase-<id>-<key>.md`). */
  key: string
  label: string
  /** One-line description shown on the phase screen. */
  hint: string
  /** Placeholder shown in the phase input box. */
  inputHint: string
}

/** The seven coarse phases, in pipeline order. */
export const PHASES: PhaseMeta[] = [
  {
    id: 1,
    key: 'topic',
    label: '选题',
    hint: '供需扫描 → 推荐 3 个候选选题，等你确认方向',
    inputHint: '想写的方向 / 领域 / 一句话想法（留空则按人设推荐）'
  },
  {
    id: 2,
    key: 'strategy',
    label: '策略',
    hint: '4D 策略 Brief + 人设维度标注 + 内容大纲',
    inputHint: '确认的选题（如「选 2」），或补充策略要求'
  },
  {
    id: 3,
    key: 'writing',
    label: '写作',
    hint: '按 Brief 出稿：开头三候选 + 全文 + 一轮 8 维自评修订',
    inputHint: '对稿件的额外要求（字数 / 风格 / 必须包含的点），可留空'
  },
  {
    id: 4,
    key: 'humanize',
    label: '去AI味',
    hint: '先审计 AI 痕迹，再改写：白话 + 特写镜头',
    inputHint: '想保留的段落 / 语气说明，可留空'
  },
  {
    id: 5,
    key: 'images',
    label: '配图',
    hint: '定位需要配图的位置，每张给出生成 prompt（脚本形态跳过）',
    inputHint: '图片风格偏好（手绘 / 信息图 / 摄影感…），可留空'
  },
  {
    id: 6,
    key: 'format',
    label: '排版',
    hint: '多平台版本改写；脚本形态则输出拍摄清单',
    inputHint: '目标平台（小红书 / 公众号 / 知乎…），可留空'
  },
  {
    id: 7,
    key: 'retro',
    label: '复盘',
    hint: '发布后回填数据 → 指标解读 → 本周创作参数',
    inputHint: '粘贴发布数据：阅读 / 点赞 / 收藏 / 转发 / 评论 / 涨粉…'
  }
]

export const PHASE_COUNT = PHASES.length

export function phaseMeta(id: number): PhaseMeta | undefined {
  return PHASES.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * Fresh phase map for a new creation. Script-format creations skip phase 5
 * (配图) — short-video scripts get a shooting list in phase 6 instead.
 */
export function initPhaseOutputs(format: CreationFormat): PhaseOutputs {
  const now = Date.now()
  const out: PhaseOutputs = {}
  for (const p of PHASES) {
    out[p.id] = {
      status: format === 'script' && p.id === 5 ? 'skipped' : 'pending',
      output: '',
      input: '',
      updated_at: now
    }
  }
  return out
}

/** Defensive JSON parse — a corrupt column falls back to a fresh article map. */
export function parsePhaseOutputs(json: string | null | undefined): PhaseOutputs {
  if (!json) return initPhaseOutputs('article')
  try {
    const raw = JSON.parse(json) as Record<string, Partial<PhaseState>>
    const out = initPhaseOutputs('article')
    for (const p of PHASES) {
      const r = raw[String(p.id)] ?? raw[p.id as unknown as string]
      if (r && typeof r === 'object') {
        out[p.id] = {
          status: (r.status as PhaseStatus) ?? 'pending',
          output: typeof r.output === 'string' ? r.output : '',
          input: typeof r.input === 'string' ? r.input : '',
          ...(typeof r.error === 'string' ? { error: r.error } : {}),
          updated_at: typeof r.updated_at === 'number' ? r.updated_at : Date.now()
        }
      }
    }
    return out
  } catch {
    return initPhaseOutputs('article')
  }
}

/**
 * Can this phase be started? Rule: every earlier phase must already hold an
 * output (done / stale) or be skipped. `stale` still unlocks downstream — the
 * yellow "需重跑" badge is a hint, not a hard gate — but a fully pending
 * upstream blocks it. This is also what keeps 复盘 (7) greyed out until the
 * draft is finalized through phase 6.
 */
export function canRunPhase(outputs: PhaseOutputs, phaseId: number): boolean {
  const meta = phaseMeta(phaseId)
  if (!meta) return false
  if (outputs[phaseId]?.status === 'skipped') return false
  for (const p of PHASES) {
    if (p.id >= phaseId) break
    const st = outputs[p.id]?.status
    if (st !== 'done' && st !== 'stale' && st !== 'skipped') return false
  }
  return true
}

/** Mark a phase as running (records the user input it was started with). */
export function applyPhaseStart(
  outputs: PhaseOutputs,
  phaseId: number,
  input: string
): PhaseOutputs {
  const next = { ...outputs }
  next[phaseId] = {
    ...next[phaseId],
    status: 'running',
    input,
    error: undefined,
    updated_at: Date.now()
  }
  return next
}

/**
 * Mark a phase as done with its output, and flag every *downstream* phase
 * that already produced output as `stale` (rerunning 写作 invalidates the
 * existing 去AI味/配图/排版 outputs — the dirty-state fix from the unified
 * design spec §2.3).
 */
export function applyPhaseDone(
  outputs: PhaseOutputs,
  phaseId: number,
  output: string
): PhaseOutputs {
  const now = Date.now()
  const next = { ...outputs }
  next[phaseId] = { ...next[phaseId], status: 'done', output, error: undefined, updated_at: now }
  for (const p of PHASES) {
    if (p.id <= phaseId) continue
    const st = next[p.id]?.status
    if (st === 'done') next[p.id] = { ...next[p.id], status: 'stale', updated_at: now }
  }
  return next
}

/** Mark a phase as errored. Its previous output (if any) is preserved. */
export function applyPhaseError(
  outputs: PhaseOutputs,
  phaseId: number,
  message: string
): PhaseOutputs {
  const next = { ...outputs }
  next[phaseId] = { ...next[phaseId], status: 'error', error: message, updated_at: Date.now() }
  return next
}

/**
 * The "current" phase for list display / the `current_phase` column: the
 * first phase that still needs work (pending / running / error / stale),
 * or the last phase when everything is done.
 */
export function currentPhase(outputs: PhaseOutputs): number {
  for (const p of PHASES) {
    const st = outputs[p.id]?.status
    if (st === 'pending' || st === 'running' || st === 'error' || st === 'stale') return p.id
  }
  return PHASE_COUNT
}

// ---------------------------------------------------------------------------
// System-prompt assembly
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<CreationFormat, string> = {
  article: '长文（article）',
  script: '短视频脚本（script）'
}

/** Per-phase cap for upstream output injected as context (chars, front-kept). */
const CONTEXT_CAPS: Record<number, number> = { 3: 24000, 4: 24000 }
const DEFAULT_CONTEXT_CAP = 6000

/**
 * Concatenate upstream phase outputs into the {previous_outputs} block.
 * The writing draft (phase 3) is what 去AI味/配图/排版 operate on, so phases
 * consuming it get a much larger cap than the summary-ish upstream briefs.
 */
export function buildPreviousOutputs(outputs: PhaseOutputs, phaseId: number): string {
  const cap = CONTEXT_CAPS[phaseId] ?? DEFAULT_CONTEXT_CAP
  const parts: string[] = []
  for (const p of PHASES) {
    if (p.id >= phaseId) break
    const st = outputs[p.id]
    if (!st || !st.output.trim()) continue
    const flag = st.status === 'stale' ? '（注意：该阶段产出可能已过时）' : ''
    let text = st.output.trim()
    if (text.length > cap) text = text.slice(0, cap) + '\n……（超长截断）'
    parts.push(`### 上游阶段产出 · 阶段${p.id} ${p.label}${flag}\n\n${text}`)
  }
  return parts.length ? parts.join('\n\n') : '（暂无上游阶段产出）'
}

export interface PromptContext {
  /** Persona system-prompt fragment ('' when no persona is bound). */
  persona: string
  /** Output of buildPreviousOutputs. */
  previousOutputs: string
  format: CreationFormat
}

/**
 * Fill a phase prompt template's context-injection points. The shared prompts
 * (creator-skills/pipeline) declare three placeholders — {persona} /
 * {previous_outputs} / {format}. Substitution is deliberately conservative:
 * only a placeholder standing alone on its own line is replaced in place —
 * the prompts also *mention* the tokens inline (e.g. `` `{persona}`：人设档案… ``
 * in their 上下文注入点 doc section), and those references must survive.
 * When a template has no standalone slot for a value, the value is appended
 * as a labelled section at the end, so context is never silently dropped.
 */
export function assemblePhaseSystem(template: string, ctx: PromptContext): string {
  const persona = ctx.persona.trim() || '（未设置人设，用中性、真诚的创作者口吻）'
  const formatLabel = FORMAT_LABELS[ctx.format]
  let out = template
  const appended: string[] = []

  const inject = (token: string, value: string, label: string): void => {
    // Standalone line: nothing but the placeholder (plus whitespace) on it.
    const slot = new RegExp(`^[ \\t]*\\{${token}\\}[ \\t]*$`, 'gm')
    if (slot.test(out)) {
      slot.lastIndex = 0
      out = out.replace(slot, () => value) // fn form: value may contain `$`
    } else {
      appended.push(`## ${label}\n\n${value}`)
    }
  }
  inject('persona', persona, '当前人设')
  inject('previous_outputs', ctx.previousOutputs, '上游阶段产出')
  inject('format', formatLabel, '内容形态（{format} 的实际值）')

  return appended.length ? `${out.trim()}\n\n${appended.join('\n\n')}` : out.trim()
}

/**
 * Approximate token usage from the streamed text. The plain runChat stream
 * doesn't surface API usage numbers, so the UI shows a character count plus
 * a rough token estimate (Chinese ≈ 1 token/char with the Claude tokenizer;
 * we label it as an estimate).
 */
export function approxUsage(text: string): { chars: number; approxTokens: number } {
  const chars = text.length
  return { chars, approxTokens: Math.max(0, Math.round(chars * 1.1)) }
}
