import { describe, it, expect } from 'vitest'
import {
  PERSONA_DIMENSIONS,
  toStringArray,
  toStringRecord,
  parseMaterialInput,
  rowToPersona,
  personaToColumns,
  countFilledDimensions,
  buildPersonaSystemPrompt,
  personaToJson,
  parsePersonaJson,
  type Persona,
  type PersonaData,
  type PersonaRow
} from '../src/main/db/persona-util'

/** A fully-populated persona used across the suites. */
function samplePersona(): Persona {
  return {
    id: 'p-1',
    name: '修老房的陈工',
    positioning: '只做老房翻新的装修工长',
    toneFormality: '半正式',
    toneExpertise: '专业易懂',
    tonePerson: '我',
    targetPlatforms: ['xiaohongshu', 'gongzhonghao'],
    bannedWords: ['家人们', '绝绝子'],
    dimensions: {
      past: ['入行第一年被包工头骗走 3 万块工钱'],
      expertise: ['能用 3 个问题判断一套老房要不要换全部水电'],
      stance: ['反对全屋定制一口价——我只按项目明细报价'],
      proof: [],
      life: ['每天收工后在工地直播答疑 30 分钟，坚持 2 年']
    },
    contentCalendar: { expertise: '每周1', stance: '每周1' },
    is_default: 1,
    project_id: null,
    created_at: 1000,
    updated_at: 2000
  }
}

describe('persona dimension metadata', () => {
  it('has exactly the five canonical dimensions in prompt order', () => {
    expect(PERSONA_DIMENSIONS.map((d) => d.key)).toEqual([
      'past',
      'expertise',
      'stance',
      'proof',
      'life'
    ])
  })
})

describe('defensive coercion helpers', () => {
  it('toStringArray accepts arrays, JSON strings, and rejects garbage', () => {
    expect(toStringArray(['a', ' b ', '', 3, null])).toEqual(['a', 'b'])
    expect(toStringArray('["x","y"]')).toEqual(['x', 'y'])
    expect(toStringArray('not json')).toEqual([])
    expect(toStringArray('{"a":1}')).toEqual([])
    expect(toStringArray(null)).toEqual([])
    expect(toStringArray(undefined)).toEqual([])
    expect(toStringArray(42)).toEqual([])
  })

  it('toStringRecord keeps only non-empty string values', () => {
    expect(toStringRecord({ a: '每周1', b: '', c: 3, d: null })).toEqual({ a: '每周1' })
    expect(toStringRecord('{"x":"每月1-2"}')).toEqual({ x: '每月1-2' })
    expect(toStringRecord('[1,2]')).toEqual({})
    expect(toStringRecord('broken')).toEqual({})
  })

  it('parseMaterialInput splits one point per line and drops empties', () => {
    expect(parseMaterialInput('  a \n\n b\n')).toEqual(['a', 'b'])
    expect(parseMaterialInput('')).toEqual([])
  })
})

describe('row ↔ persona serialization (CRUD column mapping)', () => {
  it('round-trips through personaToColumns → rowToPersona', () => {
    const p = samplePersona()
    const cols = personaToColumns(p)
    const row: PersonaRow = {
      id: p.id,
      ...cols,
      is_default: p.is_default,
      project_id: p.project_id,
      created_at: p.created_at,
      updated_at: p.updated_at
    }
    expect(rowToPersona(row)).toEqual(p)
  })

  it('hydrates legacy/NULL columns to safe defaults', () => {
    const row: PersonaRow = {
      id: 'p-2',
      name: '极简',
      positioning: null,
      tone_formality: null,
      tone_expertise: null,
      tone_person: null,
      target_platforms: null,
      banned_words: null,
      past: null,
      expertise: null,
      stance: null,
      proof: null,
      life: null,
      content_calendar: null,
      is_default: 0,
      project_id: null,
      created_at: 1,
      updated_at: 1
    }
    const p = rowToPersona(row)
    expect(p.toneFormality).toBe('半正式')
    expect(p.dimensions.past).toEqual([])
    expect(countFilledDimensions(p.dimensions)).toBe(0)
  })

  it('personaToColumns falls back to a name for blank input', () => {
    const p = { ...samplePersona(), name: '   ' }
    expect(personaToColumns(p).name).toBe('未命名人设')
  })
})

describe('buildPersonaSystemPrompt', () => {
  it('renders header, base info, and only the filled dimensions', () => {
    const prompt = buildPersonaSystemPrompt(samplePersona())
    expect(prompt).toContain('## 当前人设: 修老房的陈工')
    expect(prompt).toContain('一句话定位: 只做老房翻新的装修工长')
    expect(prompt).toContain('语言风格: 正式程度=半正式, 专业程度=专业易懂, 人称=我')
    expect(prompt).toContain('禁用词: 家人们, 绝绝子')
    expect(prompt).toContain('目标平台: xiaohongshu, gongzhonghao')
    expect(prompt).toContain('### 人设五维素材')
    expect(prompt).toContain('**过去（故事）**（让人共情你、记住你）:')
    expect(prompt).toContain('- 入行第一年被包工头骗走 3 万块工钱')
    // proof has no material → its section must be skipped entirely
    expect(prompt).not.toContain('**结果实力**')
    // calendar + the one-dimension-per-piece instruction
    expect(prompt).toContain('**内容日历配比**: 专业（干货）=每周1, 观点态度=每周1')
    expect(prompt).toContain('每篇内容应明确指向五维中的某一维')
  })

  it('omits the五维 block when all dimensions are empty', () => {
    const p = samplePersona()
    p.dimensions = { past: [], expertise: [], stance: [], proof: [], life: [] }
    const prompt = buildPersonaSystemPrompt(p)
    expect(prompt).toContain('## 当前人设: 修老房的陈工')
    expect(prompt).not.toContain('人设五维素材')
    expect(prompt).not.toContain('创作指令')
  })

  it('omits optional base lines that are blank', () => {
    const p = samplePersona()
    p.positioning = ''
    p.bannedWords = []
    p.targetPlatforms = []
    const prompt = buildPersonaSystemPrompt(p)
    expect(prompt).not.toContain('一句话定位')
    expect(prompt).not.toContain('禁用词')
    expect(prompt).not.toContain('目标平台')
  })
})

describe('JSON export / import (双端互认)', () => {
  it('round-trips: personaToJson → parsePersonaJson preserves all editable data', () => {
    const p = samplePersona()
    const parsed = parsePersonaJson(personaToJson(p))
    expect(parsed).not.toBeNull()
    const d = parsed as PersonaData
    expect(d.name).toBe(p.name)
    expect(d.positioning).toBe(p.positioning)
    expect(d.toneFormality).toBe(p.toneFormality)
    expect(d.toneExpertise).toBe(p.toneExpertise)
    expect(d.tonePerson).toBe(p.tonePerson)
    expect(d.targetPlatforms).toEqual(p.targetPlatforms)
    expect(d.bannedWords).toEqual(p.bannedWords)
    expect(d.dimensions).toEqual(p.dimensions)
    expect(d.contentCalendar).toEqual(p.contentCalendar)
  })

  it('exports lingxi-compatible top-level field names', () => {
    const obj = JSON.parse(personaToJson(samplePersona()))
    for (const key of [
      'name',
      'positioning',
      'tone',
      'targetPlatforms',
      'bannedWords',
      'past',
      'expertise',
      'stance',
      'proof',
      'life',
      'contentCalendar',
      'isDefault'
    ]) {
      expect(obj, key).toHaveProperty(key)
    }
    expect(obj.tone).toEqual({ formality: '半正式', expertise: '专业易懂', person: '我' })
    expect(obj.past).toEqual(['入行第一年被包工头骗走 3 万块工钱'])
    expect(obj.isDefault).toBe(true)
  })

  it('parses a partial file defensively, filling defaults', () => {
    const d = parsePersonaJson('{"name":"小李","expertise":["会修相机"],"tone":{"formality":"正式"}}')
    expect(d).not.toBeNull()
    expect(d!.name).toBe('小李')
    expect(d!.toneFormality).toBe('正式')
    expect(d!.toneExpertise).toBe('专业易懂') // default filled
    expect(d!.dimensions.expertise).toEqual(['会修相机'])
    expect(d!.dimensions.past).toEqual([])
    expect(d!.targetPlatforms).toEqual([])
  })

  it('names an anonymous-but-non-empty import', () => {
    const d = parsePersonaJson('{"stance":["反对内卷"]}')
    expect(d).not.toBeNull()
    expect(d!.name).toBe('导入的人设')
  })

  it('rejects non-persona payloads', () => {
    expect(parsePersonaJson('not json at all')).toBeNull()
    expect(parsePersonaJson('[]')).toBeNull()
    expect(parsePersonaJson('"string"')).toBeNull()
    expect(parsePersonaJson('{}')).toBeNull()
    expect(parsePersonaJson('{"foo":"bar"}')).toBeNull()
  })

  it('drops malformed entries inside otherwise valid files', () => {
    const d = parsePersonaJson(
      '{"name":"X","past":["ok", 42, null, ""],"contentCalendar":{"past":"每月1","junk":7}}'
    )
    expect(d!.dimensions.past).toEqual(['ok'])
    expect(d!.contentCalendar).toEqual({ past: '每月1' })
  })
})
