import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { RecommendationsResponseSchema, type SearchRequest } from '@restcommend/contracts'
import type { Config } from '../config'
import type { LogEvent, Logger } from '../log'
import { createFixtureProvider, type DemoScenario } from '../search/fixtureProvider'
import type { ResearchProvider } from '../search/researchProvider'
import { request as baseRequest } from '../search/testUtils'
import { createApp } from './app'

const KEY = 'test-key-123'

const config: Config = {
  port: 0,
  accessKey: KEY,
  searchTimeoutMs: 2000,
  maxCandidates: 10,
  ratingPriorWeight: 50,
  demoScenario: 'normal',
}

let server: Server | undefined
afterEach(() => {
  server?.close()
  server = undefined
})

interface Setup {
  scenario?: DemoScenario
  provider?: ResearchProvider
  timeoutMs?: number
}

async function start({ scenario = 'normal', provider, timeoutMs }: Setup = {}) {
  const logs: (LogEvent | string)[] = []
  const logger: Logger = { info: (e) => logs.push(e), message: (t) => logs.push(t) }
  let calls = 0
  const inner = provider ?? createFixtureProvider(scenario, 0)
  const counting: ResearchProvider = {
    research: (input) => {
      calls++
      return inner.research(input)
    },
  }
  const app = createApp({ config: { ...config, searchTimeoutMs: timeoutMs ?? config.searchTimeoutMs }, provider: counting, logger })
  server = app.listen(0)
  await new Promise((r) => server!.once('listening', r))
  const url = `http://localhost:${(server!.address() as AddressInfo).port}/v1/recommendations`
  const post = (body: unknown, key: string | null = KEY, raw?: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key === null ? {} : { 'X-App-Key': key }) },
      body: raw ?? JSON.stringify(body),
    })
  return { post, logs, calls: () => calls }
}

const areas = (areaIds: SearchRequest['areaIds'], extra: Partial<SearchRequest> = {}) =>
  baseRequest({ areaIds, ...extra })

async function json(res: Response) {
  return (await res.json()) as Record<string, unknown>
}

describe('POST /v1/recommendations', () => {
  it('rejects a missing or wrong access key before calling the provider', async () => {
    const s = await start()
    for (const key of [null, 'wrong']) {
      const res = await s.post(areas(['tel_aviv_yafo']), key)
      expect(res.status).toBe(401)
      expect(await json(res)).toEqual({ error: { code: 'UNAUTHORIZED' } })
    }
    expect(s.calls()).toBe(0)
  })

  it('rejects invalid input with VALIDATION_ERROR', async () => {
    const s = await start()
    const r = areas(['tel_aviv_yafo'])
    const p = r.participants[0]
    const bad: unknown[] = [
      { ...r, participants: [{ ...p, name: 'דנה' }] },
      { ...r, participants: Array.from({ length: 11 }, (_, i) => ({ ...p, token: `p${i + 1}` })) },
      { ...r, sharedFilters: { ...r.sharedFilters, atmospheres: ['family', 'quiet', 'romantic'] } },
      { ...r, participants: [{ ...p, profileText: 'א'.repeat(201) }] },
      { ...r, origin: { kind: 'manual_address', text: 'רחוב' } },
      { ...r, areaIds: [] },
    ]
    for (const body of bad) {
      const res = await s.post(body)
      expect(res.status).toBe(400)
      expect(await json(res)).toEqual({ error: { code: 'VALIDATION_ERROR' } })
    }
    const huge = await s.post(undefined, KEY, JSON.stringify({ ...r, requestId: 'x'.repeat(40_000) }))
    expect(huge.status).toBe(413)
    const broken = await s.post(undefined, KEY, '{not json')
    expect(broken.status).toBe(400)
    expect(s.calls()).toBe(0)
  })

  it('returns five ranked demo restaurants with explanations', async () => {
    const s = await start()
    const res = await s.post(areas(['tel_aviv_yafo', 'gush_dan']))
    expect(res.status).toBe(200)
    const body = RecommendationsResponseSchema.parse(await res.json())
    expect(body.dataSource).toBe('demo')
    expect(body.restaurants).toHaveLength(5)
    expect(body.fewerResultsReason).toBeNull()
    for (const r of body.restaurants) {
      expect(r.name.startsWith('דוגמה:')).toBe(true)
      expect(r.perParticipantReasons.map((x) => x.token)).toEqual(['p1'])
      expect(r).not.toHaveProperty('travelEstimate')
    }
    const mismatches = body.restaurants.map((r) => r.matchSummary.mismatchCount)
    expect([...mismatches].sort((a, b) => a - b)).toEqual(mismatches)
  })

  it('returns fewer than five without inventing restaurants', async () => {
    const s = await start()
    const body = RecommendationsResponseSchema.parse(await (await s.post(areas(['eilat']))).json())
    expect(body.restaurants).toHaveLength(2)
    expect(body.fewerResultsReason).toBe('fewer_than_five')
  })

  it('returns zero results as none_found (not an error)', async () => {
    const s = await start({ scenario: 'empty' })
    const res = await s.post(areas(['tel_aviv_yafo']))
    expect(res.status).toBe(200)
    const body = RecommendationsResponseSchema.parse(await res.json())
    expect(body.restaurants).toEqual([])
    expect(body.fewerResultsReason).toBe('none_found')
  })

  it('more recommendations: same parameters, no repeats, then no_more', async () => {
    const s = await start()
    const shown: string[] = []
    const sizes: number[] = []
    let last: string | null = null
    for (let i = 0; i < 6 && last !== 'no_more'; i++) {
      const res = await s.post(areas(['tel_aviv_yafo', 'gush_dan'], { requestId: `r${i}`, excludedRestaurantIds: [...shown] }))
      const body = RecommendationsResponseSchema.parse(await res.json())
      for (const r of body.restaurants) expect(shown).not.toContain(r.restaurantId)
      shown.push(...body.restaurants.map((r) => r.restaurantId))
      sizes.push(body.restaurants.length)
      last = body.fewerResultsReason
    }
    expect(last).toBe('no_more')
    expect(sizes.at(-1)).toBe(0)
    expect(new Set(shown).size).toBe(shown.length)
  })

  it('removes restaurants known to be closed at the visit time', async () => {
    const s = await start()
    // Friday 20:00 — kosher-style places are closed; lunch-only places are closed.
    const friday = areas(['tel_aviv_yafo', 'gush_dan'], {
      visitAt: { local: '2026-10-30T20:00', timeZone: 'Asia/Jerusalem', utc: '2026-10-30T18:00:00.000Z' },
    })
    const shown: string[] = []
    for (let i = 0; i < 4; i++) {
      const body = RecommendationsResponseSchema.parse(
        await (await s.post({ ...friday, requestId: `f${i}`, excludedRestaurantIds: [...shown] })).json(),
      )
      shown.push(...body.restaurants.map((r) => r.restaurantId))
    }
    for (const closed of ['demo-tlv-03', 'demo-tlv-04', 'demo-gd-01', 'demo-gd-02']) expect(shown).not.toContain(closed)
  })

  it('travel-time mode adds a marked travel estimate and explicit time deviations', async () => {
    const s = await start()
    const body = RecommendationsResponseSchema.parse(
      await (
        await s.post(
          baseRequest({ searchMode: 'travel_time', areaIds: undefined, origin: { kind: 'manual_address', text: 'רחוב הרצל 1' }, maxTravelMinutes: 15 }),
        )
      ).json(),
    )
    expect(body.restaurants.length).toBeGreaterThan(0)
    for (const r of body.restaurants) {
      expect(r.travelEstimate?.note).toBe('נתוני דוגמה')
      const t = r.parameters.find((p) => p.param === 'travel_time')
      expect(t).toBeDefined()
      if (r.travelEstimate!.minutes > 15) expect(r.deviations).toContainEqual(t)
    }
    expect(JSON.stringify(body)).not.toContain('הרצל')
  })

  it('maps a provider failure to PROVIDER_UNAVAILABLE', async () => {
    const s = await start({ scenario: 'provider_error' })
    const res = await s.post(areas(['tel_aviv_yafo']))
    expect(res.status).toBe(503)
    expect(await json(res)).toEqual({ error: { code: 'PROVIDER_UNAVAILABLE' } })
  })

  it('maps broken provider output to PROVIDER_UNAVAILABLE with no partial content', async () => {
    const s = await start({ scenario: 'invalid_output' })
    const res = await s.post(areas(['tel_aviv_yafo']))
    expect(res.status).toBe(503)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ error: { code: 'PROVIDER_UNAVAILABLE' } })
    expect(text).not.toContain('javascript')
  })

  it('maps a slow search to SEARCH_TIMEOUT', async () => {
    const s = await start({ scenario: 'slow', timeoutMs: 100 })
    const res = await s.post(areas(['tel_aviv_yafo']))
    expect(res.status).toBe(504)
    expect(await json(res)).toEqual({ error: { code: 'SEARCH_TIMEOUT' } })
  })

  it('never returns an excluded restaurant, even if the provider sends it back', async () => {
    const inner = createFixtureProvider('normal', 0)
    const ignoringExclusions: ResearchProvider = {
      research: (input) => inner.research({ ...input, request: { ...input.request, excludedRestaurantIds: [] } }),
    }
    const s = await start({ provider: ignoringExclusions })
    const excluded = ['demo-tlv-01', 'demo-tlv-02']
    const body = RecommendationsResponseSchema.parse(
      await (await s.post(areas(['tel_aviv_yafo'], { excludedRestaurantIds: excluded }))).json(),
    )
    for (const r of body.restaurants) expect(excluded).not.toContain(r.restaurantId)
  })

  it('logs no request content', async () => {
    const s = await start()
    const r = areas(['tel_aviv_yafo'], {
      participants: [{ token: 'p1', foodMode: 'specific', foodTypes: [], outingText: 'טקסט-סודי-לבדיקה', profileText: 'עוד-טקסט-סודי', diet: 'vegan' }],
    })
    await s.post(r)
    await s.post(r, 'wrong')
    await new Promise((resolve) => setTimeout(resolve, 20))
    const logged = JSON.stringify(s.logs)
    expect(s.logs.length).toBeGreaterThanOrEqual(2)
    expect(logged).not.toContain('סודי')
    expect(logged).not.toContain('דוגמה')
    expect(logged).not.toContain(KEY)
    expect(logged).not.toContain('req-1')
  })
})
