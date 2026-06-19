import { describe, it, expect } from 'vitest'
import { MATERIAL_TEMPLATES, templateById } from '../src/renderer/src/material-templates'

describe('material templates', () => {
  it('exposes well-formed templates with unique ids', () => {
    expect(MATERIAL_TEMPLATES.length).toBeGreaterThanOrEqual(3)
    const ids = MATERIAL_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of MATERIAL_TEMPLATES) {
      expect(t.label).toBeTruthy()
      expect(t.content).toBeTruthy()
    }
  })

  it('the persona template is tagged so 去AI味 can pick it up', () => {
    const persona = templateById('persona')
    expect(persona).toBeDefined()
    expect(persona!.tags).toMatch(/人设|口吻/)
  })

  it('looks up by id and returns undefined for unknown', () => {
    expect(templateById('quote')?.label).toBe('金句卡')
    expect(templateById('nope')).toBeUndefined()
  })
})
