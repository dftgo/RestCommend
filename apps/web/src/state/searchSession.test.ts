import { describe, expect, it } from 'vitest'
import type { RecommendationsResponse, Restaurant } from '@restcommend/contracts'
import { defaultSettings } from '../domain/outingSettings'
import { buildSearchRequest } from '../domain/searchRequest'
import { batchStartRanks, sessionShareText } from '../domain/results'
import { allRestaurants, appendBatch, moreFailed, moreLoading, moreRequest, startSession } from './searchSession'

const restaurant = (id: string): Restaurant => ({
  restaurantId: id,
  name: `דוגמה: ${id}`,
  city: 'חיפה',
  address: 'רחוב 1, חיפה',
  link: { url: `https://example.com/${id}`, kind: 'official_site' },
  priceEstimate: null,
  matchSummary: { mismatchCount: 0, unknownCount: 0 },
  parameters: [],
  deviations: [],
  uncertainties: [],
  perParticipantReasons: [{ token: 'p1', text: `הסבר אישי ${id}` }],
  groupReason: `הסבר קבוצתי ${id}`,
  ratingsBySource: [],
  sourceIds: [`s-${id}`],
})

const response = (ids: string[], reason: RecommendationsResponse['fewerResultsReason'] = null): RecommendationsResponse => ({
  requestId: 'x',
  dataSource: 'demo',
  searchedAt: '2026-10-25T10:00:00.000Z',
  restaurants: ids.map(restaurant),
  fewerResultsReason: reason,
  publicShareText: '',
  sources: ids.map((id) => ({ id: `s-${id}`, title: `מקור ${id}`, url: `https://example.com/s/${id}` })),
})

const settings = {
  ...defaultSettings(new Date('2026-10-24T15:00:00Z')),
  visit: { date: '2026-10-29', time: '20:00' },
  manualAddress: 'רחוב הרצל 1, חיפה',
  budgetRanges: ['100to200' as const],
}
const built = buildSearchRequest({
  participants: [{ id: 'person-dana', foodTypes: ['italian'], foodText: '', diet: 'indifferent' }],
  foodByPerson: {},
  settings,
  requestId: 'first',
})

describe('search session', () => {
  const first = startSession(built, response(['a', 'b', 'c', 'd', 'e']))

  it('"more" keeps the parameters and excludes every shown restaurant', () => {
    const second = appendBatch(first, response(['f', 'g']))
    const req = moreRequest(second, 'third')
    expect(req).toEqual({
      ...built.request,
      requestId: 'third',
      excludedRestaurantIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    })
  })

  it('adds new results below the previous ones and continues numbering', () => {
    const s = appendBatch(first, response(['f', 'g'], 'fewer_than_five'))
    expect(allRestaurants(s).map((r) => r.restaurantId)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(batchStartRanks(s.batches.map((b) => b.restaurants.length))).toEqual([1, 6])
    expect(s.sources.map((x) => x.id)).toContain('s-f')
  })

  it('a failed "more" keeps all previous results and the request', () => {
    const failed = moreFailed(moreLoading(first), 'PROVIDER_UNAVAILABLE')
    expect(failed.batches).toEqual(first.batches)
    expect(failed.baseRequest).toEqual(first.baseRequest)
    expect(failed.more).toEqual({ status: 'error', code: 'PROVIDER_UNAVAILABLE' })
  })

  it('no new restaurants = exhausted, results unchanged; repeats are dropped', () => {
    const done = appendBatch(first, response([], 'no_more'))
    expect(done.more.status).toBe('exhausted')
    expect(done.batches).toHaveLength(1)
    const repeat = appendBatch(first, response(['a', 'f']))
    expect(allRestaurants(repeat).map((r) => r.restaurantId)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('a new search replaces the previous one', () => {
    const next = startSession(built, response(['z']))
    expect(allRestaurants(next).map((r) => r.restaurantId)).toEqual(['z'])
  })

  it('share text covers every shown restaurant and leaks nothing personal', () => {
    const s = appendBatch(first, response(['f']))
    const text = sessionShareText(s)
    expect(text).toContain('6. דוגמה: f — חיפה')
    expect(text).toContain('הסבר קבוצתי a')
    expect(text).not.toContain('הסבר אישי')
    expect(text).not.toContain('person-dana')
    expect(text).not.toContain('הרצל')
    expect(text).not.toMatch(/\bp1\b/)
  })
})
