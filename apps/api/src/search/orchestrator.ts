// Runs one search: research -> closed filter -> evaluate -> rank -> explain -> validate.
// The whole chain has a hard time limit; past it the result is SEARCH_TIMEOUT.
import {
  buildPublicShareText,
  LIMITS,
  toPublicShareItem,
  type FewerResultsReason,
  type RecommendationsResponse,
  type Restaurant,
  type SearchRequest,
} from '@restcommend/contracts'
import { ApiError } from '../http/errors'
import { explain } from './explainer'
import { evaluate, type Evaluation } from './matchEvaluator'
import { openStateAt } from './openingHours'
import { rank } from './ranker'
import { ResearchResultSchema, type ResearchProvider, type ResearchResult } from './researchProvider'
import { validateResponse } from './responseValidator'

export interface SearchDeps {
  provider: ResearchProvider
  searchTimeoutMs: number
  maxCandidates: number
  ratingPriorWeight: number
  now: () => Date
}

async function research(request: SearchRequest, deps: SearchDeps): Promise<ResearchResult> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new ApiError('SEARCH_TIMEOUT'))
    }, deps.searchTimeoutMs)
  })
  try {
    const raw = await Promise.race([
      deps.provider.research({ request, maxCandidates: deps.maxCandidates, signal: controller.signal }),
      timeout,
    ])
    const parsed = ResearchResultSchema.safeParse(raw)
    if (!parsed.success) throw new ApiError('PROVIDER_UNAVAILABLE', 'invalid_output')
    return parsed.data
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError('PROVIDER_UNAVAILABLE', 'provider_error')
  } finally {
    clearTimeout(timer)
  }
}

function toRestaurant(e: Evaluation, request: SearchRequest): Restaurant {
  const c = e.candidate
  const { perParticipantReasons, groupReason } = explain(e, request)
  const restaurant: Restaurant = {
    restaurantId: c.restaurantId,
    name: c.name,
    city: c.city,
    address: c.address,
    link: c.link,
    priceEstimate: c.priceEstimate ? { ...c.priceEstimate, currency: 'ILS', sourceIds: c.sourceIds } : null,
    matchSummary: { mismatchCount: e.mismatchCount, unknownCount: e.unknownCount },
    parameters: e.parameters,
    deviations: e.parameters.filter((r) => r.status === 'mismatch'),
    uncertainties: e.parameters.filter((r) => r.status === 'unknown'),
    perParticipantReasons,
    groupReason,
    ratingsBySource: c.ratings,
    sourceIds: c.sourceIds,
  }
  if (request.searchMode === 'travel_time') {
    restaurant.travelEstimate = c.travelMinutes === null ? null : { minutes: c.travelMinutes, note: c.travelNote }
  }
  return restaurant
}

export async function runSearch(request: SearchRequest, deps: SearchDeps): Promise<RecommendationsResponse> {
  const found = await research(request, deps)

  // Defensive: never repeat a shown restaurant, never list one twice.
  const excluded = new Set(request.excludedRestaurantIds)
  const seen = new Set<string>()
  const candidates = found.candidates.filter((c) => {
    if (excluded.has(c.restaurantId) || seen.has(c.restaurantId)) return false
    seen.add(c.restaurantId)
    return true
  })

  const evaluations: Evaluation[] = []
  for (const c of candidates) {
    const state = openStateAt(c.openingHours, request.visitAt.local)
    if (state === 'closed') continue // known to be closed at the visit: removed
    evaluations.push(evaluate(c, request, state))
  }

  const ranked = rank(evaluations, LIMITS.maxResults, deps.ratingPriorWeight)
  const restaurants = ranked.map((e) => toRestaurant(e, request))

  let fewerResultsReason: FewerResultsReason | null = null
  if (restaurants.length === 0) fewerResultsReason = request.excludedRestaurantIds.length > 0 ? 'no_more' : 'none_found'
  else if (restaurants.length < LIMITS.maxResults) fewerResultsReason = 'fewer_than_five'

  const usedSources = new Set(restaurants.flatMap((r) => r.sourceIds))
  const response: RecommendationsResponse = {
    requestId: request.requestId,
    dataSource: found.dataSource,
    searchedAt: deps.now().toISOString(),
    restaurants,
    fewerResultsReason,
    publicShareText: buildPublicShareText(request.visitAt, restaurants.map(toPublicShareItem), found.dataSource),
    sources: found.sources.filter((s) => usedSources.has(s.id)),
  }
  return validateResponse(response, request)
}
