import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { safeJoin, isIgnored } from '../src/main/vault/path-guard'
import { parseMarkdown } from '../src/main/vault/markdown'
import { indexVault, buildTree } from '../src/main/vault/scan'

describe('safeJoin — vault path-traversal guard', () => {
  const root = '/vault/root'

  it('resolves ordinary in-vault paths', () => {
    expect(safeJoin(root, 'note.md')).toBe('/vault/root/note.md')
    expect(safeJoin(root, 'sub/dir/note.md')).toBe('/vault/root/sub/dir/note.md')
    expect(safeJoin(root, '')).toBe('/vault/root')
    expect(safeJoin(root, '.')).toBe('/vault/root')
  })

  it('rejects paths that escape the root', () => {
    for (const bad of ['../secret', '../../etc/passwd', 'sub/../../escape', '/etc/passwd']) {
      expect(() => safeJoin(root, bad), bad).toThrow()
    }
  })

  it('normalizes inner traversal that stays inside the root', () => {
    expect(safeJoin(root, 'a/b/../c.md')).toBe('/vault/root/a/c.md')
  })
})

describe('isIgnored — scan exclusions', () => {
  it('skips VCS, Obsidian config, deps, OS cruft', () => {
    for (const n of ['.git', '.obsidian', 'node_modules', '.trash', '.DS_Store']) {
      expect(isIgnored(n), n).toBe(true)
    }
  })
  it('keeps ordinary notes and folders', () => {
    for (const n of ['note.md', '人物', 'README.md', 'images']) {
      expect(isIgnored(n), n).toBe(false)
    }
  })
})

describe('parseMarkdown — frontmatter + wikilinks', () => {
  it('takes title from frontmatter and extracts [[links]]', () => {
    const raw = `---\ntitle: 刘备\nrole: 蜀汉\n---\n\n关羽是 [[关羽]] 的兄弟，也与 [[张飞|三弟]] 结义。`
    const p = parseMarkdown(raw, 'fallback')
    expect(p.title).toBe('刘备')
    expect(p.frontmatter.role).toBe('蜀汉')
    expect(p.links).toEqual(['关羽', '张飞'])
  })

  it('falls back to the filename title when no frontmatter', () => {
    const p = parseMarkdown('正文没有 frontmatter，只有 [[资治通鉴]]。', '关羽')
    expect(p.title).toBe('关羽')
    expect(p.links).toEqual(['资治通鉴'])
  })

  it('survives malformed frontmatter without throwing', () => {
    const raw = `---\ntitle: : : bad yaml [\n---\nbody [[链接]]`
    const p = parseMarkdown(raw, 'note')
    expect(p.links).toContain('链接')
  })
})

describe('indexVault + buildTree — over a real fixture directory', () => {
  let root: string

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'vault-test-'))
    mkdirSync(join(root, '人物'))
    mkdirSync(join(root, '.obsidian')) // must be ignored
    writeFileSync(join(root, '人物', '刘备.md'), '---\ntitle: 刘备\n---\n与 [[关羽]] 结义。')
    writeFileSync(join(root, '人物', '关羽.md'), '# 关羽\n效力于 [[刘备]]，亦提及 [[未知人物]]。')
    writeFileSync(join(root, 'README.md'), '总览，无链接。')
    writeFileSync(join(root, 'cover.png'), 'not markdown') // non-md ignored by index
    writeFileSync(join(root, '.obsidian', 'app.json'), '{}')
  })

  afterAll(() => rmSync(root, { recursive: true, force: true }))

  it('indexes only .md files, skipping ignored dirs and binaries', () => {
    const idx = indexVault(root)
    const rels = idx.files.map((f) => f.rel).sort()
    expect(rels).toEqual(['README.md', '人物/关羽.md', '人物/刘备.md'])
  })

  it('resolves wikilinks to target files and marks unresolved ones', () => {
    const idx = indexVault(root)
    const liubei = idx.links.find((l) => l.srcRel === '人物/刘备.md' && l.dstTitle === '关羽')
    expect(liubei?.dstRel).toBe('人物/关羽.md')
    const unresolved = idx.links.find((l) => l.dstTitle === '未知人物')
    expect(unresolved?.dstRel).toBeNull()
  })

  it('builds a tree with dirs first and ignored entries removed', () => {
    const tree = buildTree(root)
    const top = (tree.children ?? []).map((n) => n.name)
    expect(top).not.toContain('.obsidian')
    expect(top[0]).toBe('人物') // directory sorts before files
    expect(top).toContain('README.md')
    expect(top).toContain('cover.png') // tree shows all files, even non-md
  })
})
