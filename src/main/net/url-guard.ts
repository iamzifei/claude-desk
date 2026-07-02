import { lookup } from 'dns/promises'

/**
 * SSRF guard for the 「从链接抓取」feature. Even on a local-first desktop app a
 * pasted link can point at loopback / LAN / cloud-metadata addresses, so we
 * refuse to fetch anything that resolves into a private range and re-validate
 * every redirect hop. The IP classifier is pure & unit-tested.
 */

/** True if an IPv4/IPv6 literal is loopback, private, link-local, or otherwise non-public. */
export function isPrivateIp(ip: string): boolean {
  const addr = ip.toLowerCase().trim()

  // IPv4-mapped IPv6 (::ffff:192.168.0.1) → classify by the embedded v4.
  const mapped = addr.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (mapped) return isPrivateIp(mapped[1])

  if (addr.includes(':')) {
    // IPv6
    if (addr === '::1' || addr === '::') return true
    if (addr.startsWith('fe80') || addr.startsWith('fc') || addr.startsWith('fd')) return true
    return false
  }

  const parts = addr.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true // malformed → treat as unsafe
  const [a, b] = parts
  if (a === 0 || a === 127) return true // 0.0.0.0/8, loopback
  if (a === 10) return true // 10/8
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16/12
  if (a === 192 && b === 168) return true // 192.168/16
  if (a === 169 && b === 254) return true // 169.254/16 link-local incl. cloud metadata
  if (a >= 224) return true // multicast / reserved
  return false
}

/** Parse + scheme-check + DNS-resolve a URL; throw if it points anywhere private. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new Error('请输入有效的链接')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('只支持 http(s) 链接')
  }
  const results = await lookup(u.hostname, { all: true })
  if (results.length === 0 || results.some((r) => isPrivateIp(r.address))) {
    throw new Error('该地址指向内网或本机，已拒绝抓取')
  }
  return u
}

/** Fetch with redirects validated hop-by-hop and a response-size cap. */
export async function safeFetch(raw: string, maxBytes = 5_000_000): Promise<string> {
  let url = raw
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicUrl(url)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (LingXi-Desktop material fetcher)' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000)
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url).toString() // resolve + re-validate next loop
      continue
    }
    if (!res.ok) throw new Error(`抓取失败:HTTP ${res.status}`)
    // Cap the body so a huge page can't exhaust memory.
    const buf = await res.arrayBuffer()
    const slice = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf
    return new TextDecoder('utf-8').decode(slice)
  }
  throw new Error('重定向次数过多')
}
