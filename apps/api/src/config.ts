import { DEMO_SCENARIOS, type DemoScenario } from './search/fixtureProvider'

export interface Config {
  port: number
  accessKey: string
  searchTimeoutMs: number
  maxCandidates: number
  ratingPriorWeight: number
  demoScenario: DemoScenario
}

export class ConfigError extends Error {}

function int(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) throw new ConfigError(`${name} must be a positive whole number`)
  return n
}

/** Reads server settings. Never prints values. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const accessKey = env.APP_ACCESS_KEY?.trim() ?? ''
  if (!accessKey) {
    throw new ConfigError('APP_ACCESS_KEY is missing. Fill APP_ACCESS_KEY and VITE_APP_ACCESS_KEY (same value) in .env.')
  }
  const scenario = (env.DEMO_SCENARIO?.trim() || 'normal') as DemoScenario
  if (!DEMO_SCENARIOS.includes(scenario)) {
    throw new ConfigError(`DEMO_SCENARIO must be one of: ${DEMO_SCENARIOS.join(', ')}`)
  }
  return {
    port: int(env.API_PORT, 8787, 'API_PORT'),
    accessKey,
    searchTimeoutMs: int(env.SEARCH_TIMEOUT_MS, 55_000, 'SEARCH_TIMEOUT_MS'),
    maxCandidates: int(env.MAX_CANDIDATES, 10, 'MAX_CANDIDATES'),
    ratingPriorWeight: int(env.RATING_PRIOR_WEIGHT, 50, 'RATING_PRIOR_WEIGHT'),
    demoScenario: scenario,
  }
}
