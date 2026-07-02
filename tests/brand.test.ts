import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { BRAND_NAME, BRAND_NAME_EN, LINGXI_CLOUD_URL } from '../src/renderer/src/brand'

/**
 * Rename-safety invariants for the InkNest → LingXi Desktop rebrand.
 *
 * Electron derives the userData directory (SQLite DB, downloaded voice models,
 * copied materials) from `app.getName()`, which reads package.json
 * `productName || name`. electron-builder does NOT inject its own productName
 * into the packaged app.asar's package.json, so the effective app name — and
 * therefore the userData path — is package.json `name`. These tests pin the
 * identifiers that must never change casually, or existing users would boot
 * into an empty app (orphaned DB) or fall off the auto-update chain.
 */
const root = join(__dirname, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
const builderYml = readFileSync(join(root, 'electron-builder.yml'), 'utf-8')

describe('rename data-safety invariants', () => {
  it('keeps package.json name = claude-desk (drives the userData dir)', () => {
    expect(pkg.name).toBe('claude-desk')
  })

  it('has no productName in package.json (would override app.getName and move userData)', () => {
    expect('productName' in pkg).toBe(false)
  })

  it('keeps the legacy appId (auto-update chain + macOS keychain identity)', () => {
    expect(builderYml).toMatch(/^appId: com\.inknest\.app$/m)
  })

  it('keeps the legacy Windows executableName (existing shortcuts keep working)', () => {
    expect(builderYml).toMatch(/^\s*executableName: claude-desk$/m)
  })

  it('ships the new display name via electron-builder productName only', () => {
    expect(builderYml).toMatch(/^productName: LingXi Desktop$/m)
  })
})

describe('brand constants', () => {
  it('exposes the unified brand names', () => {
    expect(BRAND_NAME).toBe('灵犀桌面版')
    expect(BRAND_NAME_EN).toBe('LingXi Desktop')
  })

  it('points cross-promotion at the canonical cloud URL over https', () => {
    expect(LINGXI_CLOUD_URL).toBe('https://www.lingxi.show')
    expect(() => new URL(LINGXI_CLOUD_URL)).not.toThrow()
    expect(new URL(LINGXI_CLOUD_URL).protocol).toBe('https:')
  })
})
