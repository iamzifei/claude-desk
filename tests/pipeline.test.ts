import { describe, it, expect } from 'vitest'
import {
  PHASES,
  PHASE_COUNT,
  initPhaseOutputs,
  parsePhaseOutputs,
  canRunPhase,
  applyPhaseStart,
  applyPhaseDone,
  applyPhaseError,
  currentPhase,
  buildPreviousOutputs,
  assemblePhaseSystem,
  approxUsage
} from '../src/main/agent/pipeline-util'

// ---------------------------------------------------------------------------
// Phase map initialization + format branching
// ---------------------------------------------------------------------------

describe('initPhaseOutputs', () => {
  it('creates 7 pending phases for an article', () => {
    const out = initPhaseOutputs('article')
    expect(Object.keys(out)).toHaveLength(PHASE_COUNT)
    for (const p of PHASES) expect(out[p.id].status).toBe('pending')
  })

  it('skips phase 5 (配图) for the script format', () => {
    const out = initPhaseOutputs('script')
    expect(out[5].status).toBe('skipped')
    for (const p of PHASES) if (p.id !== 5) expect(out[p.id].status).toBe('pending')
  })
})

describe('parsePhaseOutputs', () => {
  it('round-trips a serialized map', () => {
    let out = initPhaseOutputs('script')
    out = applyPhaseDone(out, 1, '选题结果')
    const parsed = parsePhaseOutputs(JSON.stringify(out))
    expect(parsed[1].status).toBe('done')
    expect(parsed[1].output).toBe('选题结果')
    expect(parsed[5].status).toBe('skipped')
  })

  it('falls back to a fresh map on corrupt JSON / null', () => {
    expect(parsePhaseOutputs('not json')[1].status).toBe('pending')
    expect(parsePhaseOutputs(null)[3].status).toBe('pending')
  })
})

// ---------------------------------------------------------------------------
// Run gating (StepRail unlock rules)
// ---------------------------------------------------------------------------

describe('canRunPhase', () => {
  it('only phase 1 is runnable on a fresh creation', () => {
    const out = initPhaseOutputs('article')
    expect(canRunPhase(out, 1)).toBe(true)
    for (let p = 2; p <= 7; p++) expect(canRunPhase(out, p)).toBe(false)
  })

  it('completing a phase unlocks the next one only', () => {
    const out = applyPhaseDone(initPhaseOutputs('article'), 1, 'x')
    expect(canRunPhase(out, 2)).toBe(true)
    expect(canRunPhase(out, 3)).toBe(false)
  })

  it('a skipped phase does not block downstream (script: 4 done → 6 runnable)', () => {
    let out = initPhaseOutputs('script')
    for (const id of [1, 2, 3, 4]) out = applyPhaseDone(out, id, `p${id}`)
    expect(canRunPhase(out, 6)).toBe(true)
    // …and the skipped phase itself is never runnable.
    expect(canRunPhase(out, 5)).toBe(false)
  })

  it('复盘 (7) stays locked until the draft is finalized through 排版 (6)', () => {
    let out = initPhaseOutputs('article')
    for (const id of [1, 2, 3, 4, 5]) out = applyPhaseDone(out, id, `p${id}`)
    expect(canRunPhase(out, 7)).toBe(false)
    out = applyPhaseDone(out, 6, 'p6')
    expect(canRunPhase(out, 7)).toBe(true)
  })

  it('stale upstream still unlocks downstream (hint, not a hard gate)', () => {
    let out = initPhaseOutputs('article')
    for (const id of [1, 2, 3]) out = applyPhaseDone(out, id, `p${id}`)
    out = applyPhaseDone(out, 1, 'p1-v2') // rerun phase 1 → 2 and 3 go stale
    expect(out[2].status).toBe('stale')
    expect(canRunPhase(out, 4)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Transitions: rerun → downstream stale, error handling, current phase
// ---------------------------------------------------------------------------

describe('applyPhaseDone / rerun staleness', () => {
  it('rerunning an upstream phase marks downstream done phases stale', () => {
    let out = initPhaseOutputs('article')
    for (const id of [1, 2, 3, 4]) out = applyPhaseDone(out, id, `p${id}`)
    out = applyPhaseDone(out, 3, 'p3-v2') // rerun 写作
    expect(out[3].status).toBe('done')
    expect(out[3].output).toBe('p3-v2')
    expect(out[4].status).toBe('stale')
    expect(out[4].output).toBe('p4') // stale keeps its old output
    expect(out[1].status).toBe('done') // upstream untouched
    expect(out[2].status).toBe('done')
    expect(out[5].status).toBe('pending') // no output yet → stays pending
  })

  it('does not resurrect a skipped phase', () => {
    let out = initPhaseOutputs('script')
    for (const id of [1, 2, 3, 4, 6]) out = applyPhaseDone(out, id, `p${id}`)
    out = applyPhaseDone(out, 3, 'v2')
    expect(out[5].status).toBe('skipped')
    expect(out[6].status).toBe('stale')
  })
})

describe('applyPhaseStart / applyPhaseError', () => {
  it('start records the input and clears a previous error', () => {
    let out = initPhaseOutputs('article')
    out = applyPhaseError(out, 1, 'boom')
    expect(out[1].status).toBe('error')
    expect(out[1].error).toBe('boom')
    out = applyPhaseStart(out, 1, 'AI 效率工具方向')
    expect(out[1].status).toBe('running')
    expect(out[1].input).toBe('AI 效率工具方向')
    expect(out[1].error).toBeUndefined()
  })

  it('error preserves the previous output (retry keeps context)', () => {
    let out = applyPhaseDone(initPhaseOutputs('article'), 1, 'old output')
    out = applyPhaseStart(out, 1, 'retry')
    out = applyPhaseError(out, 1, 'network down')
    expect(out[1].output).toBe('old output')
    expect(out[1].status).toBe('error')
  })
})

describe('currentPhase', () => {
  it('is the first phase needing work; stale counts as needing work', () => {
    let out = initPhaseOutputs('article')
    expect(currentPhase(out)).toBe(1)
    for (const id of [1, 2, 3]) out = applyPhaseDone(out, id, `p${id}`)
    expect(currentPhase(out)).toBe(4)
    out = applyPhaseDone(out, 1, 'v2') // 2,3 stale
    expect(currentPhase(out)).toBe(2)
  })

  it('skipped phases are passed over; all-done lands on the last phase', () => {
    let out = initPhaseOutputs('script')
    for (const id of [1, 2, 3, 4]) out = applyPhaseDone(out, id, `p${id}`)
    expect(currentPhase(out)).toBe(6) // 5 is skipped
    for (const id of [6, 7]) out = applyPhaseDone(out, id, `p${id}`)
    expect(currentPhase(out)).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// System-prompt assembly
// ---------------------------------------------------------------------------

describe('buildPreviousOutputs', () => {
  it('concatenates upstream outputs in order, flags stale ones', () => {
    let out = initPhaseOutputs('article')
    out = applyPhaseDone(out, 1, '选题产出')
    out = applyPhaseDone(out, 2, '策略产出')
    out = applyPhaseDone(out, 3, '正文草稿')
    out = applyPhaseDone(out, 1, '选题产出v2') // 2,3 → stale
    const ctx = buildPreviousOutputs(out, 4)
    expect(ctx.indexOf('选题产出v2')).toBeLessThan(ctx.indexOf('策略产出'))
    expect(ctx).toContain('阶段3 写作（注意：该阶段产出可能已过时）')
    expect(ctx).toContain('正文草稿')
  })

  it('returns a placeholder when nothing is upstream', () => {
    expect(buildPreviousOutputs(initPhaseOutputs('article'), 1)).toBe('（暂无上游阶段产出）')
  })

  it('caps a huge non-draft upstream output but keeps the draft big for phase 4', () => {
    let out = initPhaseOutputs('article')
    out = applyPhaseDone(out, 1, 'x'.repeat(10000))
    const forPhase2 = buildPreviousOutputs(out, 2)
    expect(forPhase2.length).toBeLessThan(7000)
    expect(forPhase2).toContain('（超长截断）')
    out = applyPhaseDone(out, 2, 'brief')
    out = applyPhaseDone(out, 3, 'd'.repeat(20000))
    const forPhase4 = buildPreviousOutputs(out, 4)
    expect(forPhase4).toContain('d'.repeat(20000)) // draft survives intact
  })
})

describe('assemblePhaseSystem', () => {
  // Standalone-line slots (the substitution form).
  const tpl = '角色说明。\n\n## 人设\n\n{persona}\n\n## 上游\n\n{previous_outputs}\n\n## 形态\n\n{format}'

  it('replaces standalone-line placeholders in place', () => {
    const s = assemblePhaseSystem(tpl, {
      persona: '## 当前人设: 老张',
      previousOutputs: '### 阶段1 产出',
      format: 'article'
    })
    expect(s).toContain('## 人设\n\n## 当前人设: 老张')
    expect(s).toContain('## 上游\n\n### 阶段1 产出')
    expect(s).toContain('## 形态\n\n长文（article）')
  })

  it('maps script format to its label', () => {
    const s = assemblePhaseSystem('{format}', {
      persona: '',
      previousOutputs: '',
      format: 'script'
    })
    expect(s).toContain('短视频脚本（script）')
  })

  it('preserves inline token mentions (doc-section style) and appends the values', () => {
    // This is how the shared prompts reference tokens: inline, inside prose.
    const doc = '- `{persona}`：人设档案说明。\n- 对照 `{previous_outputs}` 归因。\n- `{format}`：形态。'
    const s = assemblePhaseSystem(doc, {
      persona: 'P',
      previousOutputs: 'PREV',
      format: 'script'
    })
    // Inline mentions survive untouched…
    expect(s).toContain('`{persona}`：人设档案说明。')
    expect(s).toContain('对照 `{previous_outputs}` 归因。')
    // …and the actual values arrive as appended labelled sections.
    expect(s).toContain('## 当前人设\n\nP')
    expect(s).toContain('## 上游阶段产出\n\nPREV')
    expect(s).toContain('短视频脚本（script）')
  })

  it('handles $-special replacement characters in values safely', () => {
    const s = assemblePhaseSystem('{persona}', {
      persona: '身价 $100 的 $& 创作者',
      previousOutputs: '',
      format: 'article'
    })
    expect(s).toContain('身价 $100 的 $& 创作者')
  })

  it('uses the neutral-voice fallback when no persona is bound', () => {
    const s = assemblePhaseSystem('{persona}', {
      persona: '',
      previousOutputs: '',
      format: 'article'
    })
    expect(s).toContain('未设置人设')
  })
})

describe('approxUsage', () => {
  it('reports char count and a rough token estimate', () => {
    const u = approxUsage('一二三四五六七八九十')
    expect(u.chars).toBe(10)
    expect(u.approxTokens).toBe(11)
  })
})
