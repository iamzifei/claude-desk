import { describe, it, expect } from 'vitest'
import { extractReadable } from '../src/main/db/materials-extract'

describe('extractReadable — HTML → readable text', () => {
  it('prefers og:title, falls back to <title>', () => {
    const og = extractReadable(
      '<html><head><meta property="og:title" content="OG 标题"><title>T</title></head><body><p>正文</p></body></html>'
    )
    expect(og.title).toBe('OG 标题')
    const t = extractReadable('<html><head><title>页面标题</title></head><body><p>x</p></body></html>')
    expect(t.title).toBe('页面标题')
  })

  it('extracts body text and strips scripts/styles/tags', () => {
    const html =
      '<html><body><script>var a=1</script><style>.x{}</style>' +
      '<article><h1>大标题</h1><p>第一段内容。</p><p>第二段内容。</p></article></body></html>'
    const out = extractReadable(html)
    expect(out.content).toContain('第一段内容。')
    expect(out.content).toContain('第二段内容。')
    expect(out.content).not.toContain('var a=1')
    expect(out.content).not.toContain('.x{}')
    expect(out.content).not.toContain('<')
  })

  it('decodes HTML entities', () => {
    const out = extractReadable('<body><p>A&amp;B&nbsp;&#39;quoted&#39; &#x4e2d;文</p></body>')
    expect(out.content).toContain("A&B 'quoted' 中文")
  })

  it('caps content length with an ellipsis', () => {
    const long = '字'.repeat(5000)
    const out = extractReadable(`<body><p>${long}</p></body>`, 100)
    expect(out.content.length).toBeLessThanOrEqual(101)
    expect(out.content.endsWith('…')).toBe(true)
  })

  it('keeps paragraph breaks between blocks', () => {
    const out = extractReadable('<body><p>一</p><p>二</p></body>')
    expect(out.content).toBe('一\n二')
  })
})
