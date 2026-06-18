import { describe, it, expect } from 'vitest'
import { buildAtomExtractPrompt, parseAtoms, ATOM_TYPES } from '../src/main/db/atom-extract'

describe('buildAtomExtractPrompt', () => {
  it('embeds the source and asks for JSON of typed atoms', () => {
    const { system, prompt } = buildAtomExtractPrompt('我的长素材内容')
    expect(prompt).toContain('我的长素材内容')
    expect(system).toContain('JSON')
    for (const t of ATOM_TYPES) expect(system).toContain(t)
  })
})

describe('parseAtoms', () => {
  it('parses a clean JSON array', () => {
    const raw = '[{"content":"观点A","type":"观点"},{"content":"金句B","type":"金句","tags":"AI"}]'
    const atoms = parseAtoms(raw)
    expect(atoms).toHaveLength(2)
    expect(atoms[0]).toEqual({ content: '观点A', type: '观点', tags: undefined })
    expect(atoms[1]).toEqual({ content: '金句B', type: '金句', tags: 'AI' })
  })

  it('tolerates ```json fences and surrounding prose', () => {
    const raw = '好的,结果如下:\n```json\n[{"content":"X","type":"数据"}]\n```\n以上。'
    const atoms = parseAtoms(raw)
    expect(atoms).toHaveLength(1)
    expect(atoms[0].type).toBe('数据')
  })

  it('falls back to 观点 for unknown types and drops empty content', () => {
    const raw = '[{"content":"Y","type":"乱写"},{"content":"  ","type":"观点"},{"type":"金句"}]'
    const atoms = parseAtoms(raw)
    expect(atoms).toHaveLength(1)
    expect(atoms[0]).toEqual({ content: 'Y', type: '观点', tags: undefined })
  })

  it('returns [] for non-array / invalid JSON', () => {
    expect(parseAtoms('not json')).toEqual([])
    expect(parseAtoms('{"content":"x"}')).toEqual([])
    expect(parseAtoms('')).toEqual([])
  })

  it('caps the number of atoms', () => {
    const many = JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ content: `a${i}`, type: '观点' })))
    expect(parseAtoms(many, 10)).toHaveLength(10)
  })
})
