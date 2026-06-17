import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, realpathSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { underCwd, bashAllowed } from '../src/main/agent/coding-guard'

describe('underCwd — file-write confinement', () => {
  // The caller passes realpath(cwd); mirror that so symlinked /tmp resolves.
  let cwd: string
  beforeAll(() => {
    cwd = realpathSync(mkdtempSync(join(tmpdir(), 'cg-')))
  })
  afterAll(() => rmSync(cwd, { recursive: true, force: true }))

  it('allows a relative path inside cwd', () => {
    expect(underCwd('notes.txt', cwd)).toBe(true)
    expect(underCwd('sub/dir/a.ts', cwd)).toBe(true)
  })

  it('allows an absolute path inside cwd', () => {
    expect(underCwd(join(cwd, 'a.txt'), cwd)).toBe(true)
  })

  it('denies escaping the cwd via ..', () => {
    expect(underCwd('../escape.txt', cwd)).toBe(false)
    expect(underCwd('../../etc/passwd', cwd)).toBe(false)
  })

  it('denies an absolute path outside cwd', () => {
    expect(underCwd('/Users/james/secret.txt', cwd)).toBe(false)
    expect(underCwd('/etc/hosts', cwd)).toBe(false)
  })

  it('denies non-string input', () => {
    expect(underCwd(undefined, cwd)).toBe(false)
    expect(underCwd(42, cwd)).toBe(false)
    expect(underCwd(null, cwd)).toBe(false)
  })

  it('does not treat a sibling prefix dir as inside', () => {
    expect(underCwd(cwd + '-evil/x', cwd)).toBe(false)
  })
})

describe('bashAllowed — destructive-command denylist', () => {
  it('allows ordinary commands', () => {
    for (const c of ['npm test', 'ls -la', 'git status', 'node build.js', 'rm tmp.txt', 'cat a.ts']) {
      expect(bashAllowed(c)).toBe(true)
    }
  })

  it('blocks destructive / privileged commands', () => {
    for (const c of [
      'sudo rm file',
      'rm -rf /',
      'rm -fr ~/stuff',
      'dd if=/dev/zero of=/dev/sda',
      'mkfs.ext4 /dev/sda1',
      ':(){ :|:& };:',
      'shutdown -h now',
      'chmod -R 777 /'
    ]) {
      expect(bashAllowed(c)).toBe(false)
    }
  })
})
