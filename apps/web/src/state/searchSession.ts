// The current search (ARCHITECTURE 2.2 SearchSession). Memory only.
// Pure functions so the "more recommendations" rules can be tested.
import type {
  DataSource,
  FewerResultsReason,
  RecommendationsResponse,
  Restaurant,
  SearchRequest,
  Source,
} from '@restcommend/contracts'
import type { SearchErrorCode } from '../domain/errors'
import type { BuiltRequest, ParticipantMap } from '../domain/searchRequest'

export interface ResultBatch {
  restaurants: Restaurant[]
  fewerResultsReason: FewerResultsReason | null
}

export type MoreState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; code: SearchErrorCode }
  | { status: 'exhausted' }

export interface SearchSession {
  /** The parameters of this search; reused as-is for "more". */
  baseRequest: SearchRequest
  /** token -> person id; never sent. */
  participantMap: ParticipantMap
  dataSource: DataSource
  batches: ResultBatch[]
  shownRestaurantIds: string[]
  /** Sources referenced by the shown restaurants (all batches). */
  sources: Source[]
  more: MoreState
}

function batchOf(res: RecommendationsResponse, alreadyShown: Set<string>): ResultBatch {
  // Defensive: never show the same restaurant twice.
  const restaurants = res.restaurants.filter((r) => !alreadyShown.has(r.restaurantId))
  return { restaurants, fewerResultsReason: res.fewerResultsReason }
}

/** A new search replaces any previous one. */
export function startSession(built: BuiltRequest, res: RecommendationsResponse): SearchSession {
  const batch = batchOf(res, new Set())
  return {
    baseRequest: built.request,
    participantMap: built.participantMap,
    dataSource: res.dataSource,
    batches: [batch],
    shownRestaurantIds: batch.restaurants.map((r) => r.restaurantId),
    sources: res.sources,
    more: { status: batch.restaurants.length === 0 ? 'exhausted' : 'idle' },
  }
}

/** The "more" request: same parameters, new id, every shown restaurant excluded. */
export function moreRequest(s: SearchSession, requestId: string): SearchRequest {
  return { ...s.baseRequest, requestId, excludedRestaurantIds: [...s.shownRestaurantIds] }
}

export function moreLoading(s: SearchSession): SearchSession {
  return { ...s, more: { status: 'loading' } }
}

/** A failed "more" keeps every previous result and the outing details. */
export function moreFailed(s: SearchSession, code: SearchErrorCode): SearchSession {
  return { ...s, more: { status: 'error', code } }
}

/** New results go below the previous ones. */
export function appendBatch(s: SearchSession, res: RecommendationsResponse): SearchSession {
  const batch = batchOf(res, new Set(s.shownRestaurantIds))
  if (batch.restaurants.length === 0) return { ...s, more: { status: 'exhausted' } }
  return {
    ...s,
    batches: [...s.batches, batch],
    shownRestaurantIds: [...s.shownRestaurantIds, ...batch.restaurants.map((r) => r.restaurantId)],
    sources: mergeSources(s.sources, res.sources),
    more: { status: 'idle' },
  }
}

export function allRestaurants(s: SearchSession): Restaurant[] {
  return s.batches.flatMap((b) => b.restaurants)
}

function mergeSources(a: Source[], b: Source[]): Source[] {
  const ids = new Set(a.map((s) => s.id))
  return [...a, ...b.filter((s) => !ids.has(s.id))]
}
