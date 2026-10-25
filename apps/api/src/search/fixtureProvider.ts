// Demo research provider (Milestone 3). Returns clearly marked fictional
// restaurants. DEMO_SCENARIO lets us see every error state during development.
import type { ResearchInput, ResearchProvider, ResearchResult } from './researchProvider'
import { demoCandidates, demoSources } from './fixtures/restaurants'

export const DEMO_SCENARIOS = ['normal', 'empty', 'provider_error', 'invalid_output', 'slow'] as const
export type DemoScenario = (typeof DEMO_SCENARIOS)[number]

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('aborted'))
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new Error('aborted'))
    })
  })
}

export function createFixtureProvider(scenario: DemoScenario = 'normal', delayMs = 1500): ResearchProvider {
  return {
    async research({ request, maxCandidates, signal }: ResearchInput): Promise<unknown> {
      await wait(delayMs, signal)

      switch (scenario) {
        case 'provider_error':
          throw new Error('demo provider failure')
        case 'slow':
          await wait(24 * 60 * 60 * 1000, signal) // ends only when the time limit aborts it
          break
        case 'empty':
          return { dataSource: 'demo', candidates: [], sources: [] } satisfies ResearchResult
      }

      const excluded = new Set(request.excludedRestaurantIds)
      let pool = demoCandidates(request.searchMode === 'travel_time').filter((c) => !excluded.has(c.restaurantId))
      if (request.searchMode === 'areas') {
        const areas = new Set<string>(request.areaIds ?? [])
        pool = pool.filter((c) => c.areaId !== null && areas.has(c.areaId))
      } else {
        // Demo travel times are fixed per restaurant (they ignore the origin).
        pool = [...pool].sort((a, b) => (a.travelMinutes ?? 0) - (b.travelMinutes ?? 0))
      }
      const candidates = pool.slice(0, maxCandidates)

      if (scenario === 'invalid_output' && candidates.length > 0) {
        const broken = { ...candidates[0], name: '', link: { url: 'javascript:alert(1)', kind: 'official_site' } }
        return { dataSource: 'demo', candidates: [broken, ...candidates.slice(1)], sources: demoSources() }
      }
      return { dataSource: 'demo', candidates, sources: demoSources() } satisfies ResearchResult
    },
  }
}
