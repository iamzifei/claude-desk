import { describe, it, expect } from 'vitest'
import { isPrivateIp } from '../src/main/net/url-guard'

describe('isPrivateIp — SSRF range classifier', () => {
  it('flags loopback / private / link-local IPv4', () => {
    for (const ip of [
      '127.0.0.1',
      '127.1.2.3',
      '0.0.0.0',
      '10.0.0.5',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // cloud metadata
      '224.0.0.1' // multicast
    ]) {
      expect(isPrivateIp(ip), ip).toBe(true)
    }
  })

  it('allows ordinary public IPv4', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.0.1', '172.32.0.1']) {
      expect(isPrivateIp(ip), ip).toBe(false)
    }
  })

  it('flags loopback / ULA / link-local IPv6', () => {
    for (const ip of ['::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1']) {
      expect(isPrivateIp(ip), ip).toBe(true)
    }
  })

  it('classifies IPv4-mapped IPv6 by the embedded address', () => {
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false)
  })

  it('treats malformed input as unsafe', () => {
    expect(isPrivateIp('not-an-ip')).toBe(true)
    expect(isPrivateIp('999.1.1.1')).toBe(true)
  })

  it('allows public IPv6', () => {
    expect(isPrivateIp('2606:4700:4700::1111')).toBe(false)
  })
})
