// The set of web pages the search actually returned. A URL the model cites is
// accepted only if it is in this set — anything else is treated as invented.
import { createHash } from 'node:crypto'
import { isHttpsUrl, type Source } from '@restcommend/contracts'

const TRACKING = /^(utm_.*|srsltid|fbclid|gclid|ref|ref_src)$/i

const sha1 = (text: string) => createHash('sha1').update(text).digest('hex')

/** Host without "www.", lower case. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Comparable form of a URL (https only): host + path + sorted non-tracking params. */
export function urlKey(raw: string, withQuery = true): string | null {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase().replace(/^www\./, '')
  let path = decodeURIComponentSafe(u.pathname).replace(/\/+$/, '')
  if (path === '') path = '/'
  if (!withQuery) return host + path
  const params = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b))
  const query = params.length > 0 ? `?${params.map(([k, v]) => `${k}=${v}`).join('&')}` : ''
  return host + path + query
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** Stable id, so sources merge correctly across "more recommendations" requests. */
export function sourceIdOf(url: string): string {
  return `src-${sha1(urlKey(url) ?? url).slice(0, 12)}`
}

/** Stable restaurant id from name + city, so a restaurant keeps its id across requests. */
export function restaurantIdOf(name: string, city: string): string {
  const norm = (s: string) =>
    s
      .normalize('NFKC')
      .toLocaleLowerCase()
      .replace(/["'׳״`.,()\-–—:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  return `live-${sha1(`${norm(name)}|${norm(city)}`).slice(0, 16)}`
}

export interface FoundPage {
  url: string
  title?: string
}

interface Entry {
  id: string
  url: string
  title?: string
}

export class SourceRegistry {
  private byKey = new Map<string, Entry>()
  private byPath = new Map<string, Entry>()
  private hosts = new Set<string>()
  private usedIds = new Map<string, Entry>()

  constructor(
    found: FoundPage[],
    private retrievedAt: string,
  ) {
    for (const page of found) {
      // Only https pages may reach the screen.
      if (!isHttpsUrl(page.url)) continue
      const key = urlKey(page.url)
      const pathKey = urlKey(page.url, false)
      if (!key || !pathKey) continue
      const existing = this.byKey.get(key)
      if (existing) {
        if (!existing.title && page.title) existing.title = page.title
        continue
      }
      const entry: Entry = { id: sourceIdOf(page.url), url: page.url, title: page.title }
      this.byKey.set(key, entry)
      if (!this.byPath.has(pathKey)) this.byPath.set(pathKey, entry)
      const host = hostOf(page.url)
      if (host) this.hosts.add(host)
    }
  }

  get size(): number {
    return this.byKey.size
  }

  /** The search result matching a cited URL, or null if the search never returned it. */
  verify(url: string): Entry | null {
    const key = urlKey(url)
    if (!key) return null
    const entry = this.byKey.get(key) ?? this.byPath.get(urlKey(url, false)!) ?? null
    return entry
  }

  /** Verified ids for a list of cited URLs (unverified ones are dropped). */
  ids(urls: string[]): string[] {
    const out: string[] = []
    for (const url of urls) {
      const e = this.verify(url)
      if (e && !out.includes(e.id)) {
        out.push(e.id)
        this.usedIds.set(e.id, e)
      }
    }
    return out
  }

  hasHost(host: string): boolean {
    return this.hosts.has(host)
  }

  /** Sources referenced by kept facts, ready for the response. */
  used(): Source[] {
    return [...this.usedIds.values()].map((e) => ({
      id: e.id,
      title: (e.title?.trim() || hostOf(e.url) || e.url).slice(0, 300),
      url: e.url,
      retrievedAt: this.retrievedAt,
    }))
  }
}
