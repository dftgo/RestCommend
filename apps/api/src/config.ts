import { DEMO_SCENARIOS, type DemoScenario } from './search/fixtureProvider'

export const RESEARCH_PROVIDERS = ['openai', 'demo'] as const
export type ResearchProviderKind = (typeof RESEARCH_PROVIDERS)[number]

export const SEARCH_CONTEXT_SIZES = ['low', 'medium', 'high'] as const
export type SearchContextSize = (typeof SEARCH_CONTEXT_SIZES)[number]

export interface OpenAIConfig {
  apiKey: string
  model: string
  maxSearchCalls: number
  maxOutputTokens: number
  searchContextSize: SearchContextSize
  /** Parallel research calls per search, each finding part of the candidates (1–3). */
  parallelCalls: number
}

export interface Config {
  port: number
  accessKey: string
  searchTimeoutMs: number
  maxCandidates: number
  ratingPriorWeight: number
  demoScenario: DemoScenario
  researchProvider: ResearchProviderKind
  /** Present when researchProvider is 'openai'. */
  openai?: OpenAIConfig
}

export class ConfigError extends Error {}

function int(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) throw new ConfigError(`${name} must be a positive whole number`)
  return n
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T, name: string): T {
  const v = value?.trim() || fallback
  if (!(allowed as readonly string[]).includes(v)) throw new ConfigError(`${name} must be one of: ${allowed.join(', ')}`)
  return v as T
}

/** Reads server settings. Never prints values. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const accessKey = env.APP_ACCESS_KEY?.trim() ?? ''
  if (!accessKey) {
    throw new ConfigError('APP_ACCESS_KEY is missing. Fill APP_ACCESS_KEY and VITE_APP_ACCESS_KEY (same value) in .env.')
  }
  const demoScenario = oneOf(env.DEMO_SCENARIO, DEMO_SCENARIOS, 'normal', 'DEMO_SCENARIO')

  const apiKey = env.OPENAI_API_KEY?.trim() ?? ''
  const researchProvider = oneOf(env.RESEARCH_PROVIDER, RESEARCH_PROVIDERS, apiKey ? 'openai' : 'demo', 'RESEARCH_PROVIDER')
  let openai: OpenAIConfig | undefined
  if (researchProvider === 'openai') {
    if (!apiKey) throw new ConfigError('OPENAI_API_KEY is missing in .env (needed when RESEARCH_PROVIDER=openai).')
    openai = {
      apiKey,
      model: env.OPENAI_MODEL?.trim() || 'gpt-5.5',
      maxSearchCalls: int(env.MAX_SEARCH_CALLS, 8, 'MAX_SEARCH_CALLS'),
      maxOutputTokens: int(env.MAX_OUTPUT_TOKENS, 12_000, 'MAX_OUTPUT_TOKENS'),
      searchContextSize: oneOf(env.SEARCH_CONTEXT_SIZE, SEARCH_CONTEXT_SIZES, 'medium', 'SEARCH_CONTEXT_SIZE'),
      parallelCalls: Math.min(3, int(env.PARALLEL_SEARCHES, 1, 'PARALLEL_SEARCHES')),
    }
  }

  return {
    port: int(env.API_PORT, 8787, 'API_PORT'),
    accessKey,
    searchTimeoutMs: int(env.SEARCH_TIMEOUT_MS, 90_000, 'SEARCH_TIMEOUT_MS'),
    maxCandidates: int(env.MAX_CANDIDATES, 10, 'MAX_CANDIDATES'),
    ratingPriorWeight: int(env.RATING_PRIOR_WEIGHT, 50, 'RATING_PRIOR_WEIGHT'),
    demoScenario,
    researchProvider,
    openai,
  }
}
