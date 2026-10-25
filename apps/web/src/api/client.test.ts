import { describe, expect, it } from 'vitest'
import type { SearchRequest } from '@restcommend/contracts'
import { postRecommendations, SearchCancelled, SearchError } from './client'
import { canRetry, errorMessage } from '../domain/errors'

const request = { requestId: 'r' } as SearchRequest

const reply = (status: number, body: unknown): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })) as typeof fetch

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise
    return 'ok'
  } catch (e) {
    if (e instanceof SearchError) return e.code
    if (e instanceof SearchCancelled) return 'cancelled'
    throw e
  }
}

describe('api client', () => {
  it('sends the access key header', async () => {
    let seen: string | null = null
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      seen = new Headers(init.headers).get('X-App-Key')
      return new Response('{}', { status: 500 })
    }) as typeof fetch
    await codeOf(postRecommendations(request, { fetchImpl, accessKey: 'k1' }))
    expect(seen).toBe('k1')
  })

  it('maps server error codes', async () => {
    for (const code of ['UNAUTHORIZED', 'VALIDATION_ERROR', 'PROVIDER_UNAVAILABLE', 'SEARCH_TIMEOUT', 'RATE_LIMITED']) {
      expect(await codeOf(postRecommendations(request, { fetchImpl: reply(503, { error: { code } }) }))).toBe(code)
    }
    expect(await codeOf(postRecommendations(request, { fetchImpl: reply(401, 'x') }))).toBe('UNAUTHORIZED')
    expect(await codeOf(postRecommendations(request, { fetchImpl: reply(502, 'x') }))).toBe('PROVIDER_UNAVAILABLE')
  })

  it('treats a response that breaks the schema as a service error', async () => {
    expect(await codeOf(postRecommendations(request, { fetchImpl: reply(200, { restaurants: 'no' }) }))).toBe('PROVIDER_UNAVAILABLE')
  })

  it('reports no internet when offline', async () => {
    const failing = (async () => {
      throw new TypeError('network')
    }) as typeof fetch
    expect(await codeOf(postRecommendations(request, { fetchImpl: failing, isOnline: () => false }))).toBe('OFFLINE')
    expect(await codeOf(postRecommendations(request, { fetchImpl: failing, isOnline: () => true }))).toBe('PROVIDER_UNAVAILABLE')
  })

  it('gives up after its time limit', async () => {
    const hanging = ((_url: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))))) as typeof fetch
    expect(await codeOf(postRecommendations(request, { fetchImpl: hanging, timeoutMs: 20 }))).toBe('SEARCH_TIMEOUT')
    const c = new AbortController()
    const p = postRecommendations(request, { fetchImpl: hanging, signal: c.signal })
    c.abort()
    expect(await codeOf(p)).toBe('cancelled')
  })

  it('has a Hebrew message for every code; no retry only for UNAUTHORIZED', () => {
    expect(errorMessage('OFFLINE')).toBe('אין חיבור לאינטרנט. התחברו ונסו שוב.')
    expect(canRetry('UNAUTHORIZED')).toBe(false)
    expect(canRetry('SEARCH_TIMEOUT')).toBe(true)
  })
})
