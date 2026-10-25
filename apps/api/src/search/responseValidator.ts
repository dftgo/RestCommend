// Final gate before anything reaches the app: schema + consistency checks.
// A failure becomes PROVIDER_UNAVAILABLE; partial JSON is never returned.
import {
  LIMITS,
  RecommendationsResponseSchema,
  type RecommendationsResponse,
  type SearchRequest,
} from '@restcommend/contracts'
import { ApiError } from '../http/errors'

function fail(): never {
  throw new ApiError('PROVIDER_UNAVAILABLE', 'invalid_output')
}

export function validateResponse(value: unknown, request: SearchRequest): RecommendationsResponse {
  const parsed = RecommendationsResponseSchema.safeParse(value)
  if (!parsed.success) fail()
  const res = parsed.data

  if (res.restaurants.length > LIMITS.maxResults) fail()
  const ids = res.restaurants.map((r) => r.restaurantId)
  if (new Set(ids).size !== ids.length) fail()
  const excluded = new Set(request.excludedRestaurantIds)
  if (ids.some((id) => excluded.has(id))) fail()

  const tokens = new Set(request.participants.map((p) => p.token))
  const sourceIds = new Set(res.sources.map((s) => s.id))
  for (const r of res.restaurants) {
    if (r.perParticipantReasons.some((x) => !tokens.has(x.token))) fail()
    if (r.parameters.some((x) => x.token !== undefined && !tokens.has(x.token))) fail()
    const mismatches = r.parameters.filter((x) => x.status === 'mismatch')
    const unknowns = r.parameters.filter((x) => x.status === 'unknown')
    if (r.matchSummary.mismatchCount !== mismatches.length || r.deviations.length !== mismatches.length) fail()
    if (r.matchSummary.unknownCount !== unknowns.length || r.uncertainties.length !== unknowns.length) fail()
    if (r.sourceIds.some((id) => !sourceIds.has(id))) fail()
    if (request.searchMode === 'areas' && r.travelEstimate !== undefined) fail()
  }
  return res
}
