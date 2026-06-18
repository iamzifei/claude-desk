import { describe, it, expect } from 'vitest'
import { extractWikiLinks, tokenizeWikiLinks } from '../src/main/db/link-parse'

describe('extractWikiLinks', () => {
  it('extracts titles and de-dupes', () => {
    expect(extractWikiLinks('see [[副业避坑]] and [[读者画像]] and [[副业避坑]]')).toEqual([
      '副业避坑',
      '读者画像'
    ])
  })
  it('drops |alias and trims', () => {
    expect(extractWikiLinks('[[ 标题 | 别名 ]]')).toEqual(['标题'])
  })
  it('returns [] when none', () => {
    expect(extractWikiLinks('no links here')).toEqual([])
    expect(extractWikiLinks('')).toEqual([])
  })
  it('ignores empty brackets', () => {
    expect(extractWikiLinks('[[]] [[  ]]')).toEqual([])
  })
})

describe('tokenizeWikiLinks', () => {
  it('splits text and link tokens in order', () => {
    expect(tokenizeWikiLinks('a [[X]] b')).toEqual([{ text: 'a ' }, { link: 'X' }, { text: ' b' }])
  })
  it('handles a leading link and no trailing text', () => {
    expect(tokenizeWikiLinks('[[X]]tail')).toEqual([{ link: 'X' }, { text: 'tail' }])
  })
  it('plain text → single text token', () => {
    expect(tokenizeWikiLinks('plain')).toEqual([{ text: 'plain' }])
  })
})
