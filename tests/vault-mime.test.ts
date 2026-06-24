import { describe, it, expect } from 'vitest'
import { mimeForExt, previewKindForRel } from '../src/main/vault/mime'

describe('mimeForExt', () => {
  it('maps common extensions (case-insensitive)', () => {
    expect(mimeForExt('.png')).toBe('image/png')
    expect(mimeForExt('.JPG')).toBe('image/jpeg')
    expect(mimeForExt('.pdf')).toBe('application/pdf')
    expect(mimeForExt('.md')).toBe('text/markdown')
  })
  it('falls back to octet-stream for unknown types', () => {
    expect(mimeForExt('.xyz')).toBe('application/octet-stream')
    expect(mimeForExt('')).toBe('application/octet-stream')
  })
})

describe('previewKindForRel', () => {
  it('classifies by surface', () => {
    expect(previewKindForRel('人物/刘备.md')).toBe('markdown')
    expect(previewKindForRel('a/b/cover.PNG')).toBe('image')
    expect(previewKindForRel('report.pdf')).toBe('pdf')
    expect(previewKindForRel('data.csv')).toBe('text')
    expect(previewKindForRel('notes.json')).toBe('text')
    expect(previewKindForRel('archive.zip')).toBe('binary')
    expect(previewKindForRel('扫描件.docx')).toBe('binary')
    expect(previewKindForRel('noext')).toBe('binary')
  })
})
