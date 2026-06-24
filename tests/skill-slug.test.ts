import { describe, it, expect } from 'vitest'
import { slugifySkillName, extractSlashTokens } from '../src/main/db/skill-parse'

describe('slugifySkillName', () => {
  it('kebab-cases ascii and lowercases', () => {
    expect(slugifySkillName('Ad Creative')).toBe('ad-creative')
    expect(slugifySkillName('PR Review Toolkit')).toBe('pr-review-toolkit')
  })
  it('keeps CJK, replacing separators with -', () => {
    expect(slugifySkillName('小红书 文案')).toBe('小红书-文案')
    expect(slugifySkillName('选题/装配')).toBe('选题-装配')
  })
  it('collapses repeats and trims', () => {
    expect(slugifySkillName('  a   b  ')).toBe('a-b')
    expect(slugifySkillName('---x---')).toBe('x')
  })
  it('falls back for empty', () => {
    expect(slugifySkillName('   ')).toBe('skill')
  })
})

describe('extractSlashTokens', () => {
  it('finds /commands at word boundaries', () => {
    expect(extractSlashTokens('用 /ads-review 看看，再 /小红书-文案')).toEqual([
      'ads-review',
      '小红书-文案'
    ])
  })
  it('ignores slashes mid-word (e.g. URLs / paths)', () => {
    expect(extractSlashTokens('see https://x.com/y and a/b/c')).toEqual([])
  })
  it('matches a command at the very start', () => {
    expect(extractSlashTokens('/foo bar')).toEqual(['foo'])
  })
  it('returns empty when there are none', () => {
    expect(extractSlashTokens('no commands here')).toEqual([])
  })
})
