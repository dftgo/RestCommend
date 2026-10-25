import { describe, expect, it } from 'vitest'
import {
  buildPublicShareText,
  DEMO_SHARE_NOTE,
  formatVisitLocal,
  RecommendationsResponseSchema,
  SearchRequestSchema,
  toPublicShareItem,
  type Restaurant,
  type SearchRequest,
} from './index'

const base: SearchRequest = {
  requestId: 'req-1',
  participants: [
    { token: 'p1', foodMode: 'use_saved', foodTypes: ['italian'], profileText: 'פסטה', diet: 'vegetarian' },
    { token: 'p2', foodMode: 'specific', foodTypes: ['sushi'], outingText: 'משהו קליל', diet: 'indifferent' },
  ],
  sharedFilters: { budgetRanges: ['100to200'], kosher: 'indifferent', atmospheres: 'indifferent' },
  visitAt: { local: '2026-10-29T20:00', timeZone: 'Asia/Jerusalem', utc: '2026-10-29T18:00:00.000Z' },
  searchMode: 'areas',
  areaIds: ['tel_aviv_yafo'],
  excludedRestaurantIds: [],
}

const travel: SearchRequest = {
  ...base,
  searchMode: 'travel_time',
  areaIds: undefined,
  origin: { kind: 'manual_address', text: 'רחוב הרצל 1, חיפה' },
  maxTravelMinutes: 30,
}
delete travel.areaIds

const ok = (r: unknown) => SearchRequestSchema.safeParse(r).success

describe('request schema', () => {
  it('accepts valid requests in both modes', () => {
    expect(ok(base)).toBe(true)
    expect(ok(travel)).toBe(true)
  })

  it('rejects unknown fields such as a participant name', () => {
    expect(ok({ ...base, participants: [{ ...base.participants[0], name: 'דנה' }] })).toBe(false)
    expect(ok({ ...base, parking: 'easy' })).toBe(false)
  })

  it('enforces participant limits and unique tokens', () => {
    const p = base.participants[0]
    const eleven = Array.from({ length: 11 }, (_, i) => ({ ...p, token: `p${i + 1}` }))
    expect(ok({ ...base, participants: eleven })).toBe(false)
    expect(ok({ ...base, participants: [] })).toBe(false)
    expect(ok({ ...base, participants: [p, p] })).toBe(false)
  })

  it('limits free text to 200 characters', () => {
    const long = 'א'.repeat(201)
    expect(ok({ ...base, participants: [{ ...base.participants[0], profileText: long }] })).toBe(false)
    expect(ok({ ...base, participants: [{ ...base.participants[0], profileText: 'א'.repeat(200) }] })).toBe(true)
  })

  it('allows at most two atmospheres', () => {
    const f = base.sharedFilters
    expect(ok({ ...base, sharedFilters: { ...f, atmospheres: ['family', 'quiet'] } })).toBe(true)
    expect(ok({ ...base, sharedFilters: { ...f, atmospheres: ['family', 'quiet', 'romantic'] } })).toBe(false)
  })

  it('enforces the fields of each search mode', () => {
    expect(ok({ ...base, origin: travel.origin })).toBe(false)
    expect(ok({ ...base, maxTravelMinutes: 30 })).toBe(false)
    expect(ok({ ...base, areaIds: [] })).toBe(false)
    expect(ok({ ...base, areaIds: undefined })).toBe(false)
    expect(ok({ ...travel, areaIds: ['sharon'] })).toBe(false)
    expect(ok({ ...travel, origin: undefined })).toBe(false)
    expect(ok({ ...travel, maxTravelMinutes: 20 })).toBe(false)
  })
})

const restaurant: Restaurant = {
  restaurantId: 'demo-1',
  name: 'דוגמה: טרטוריה',
  city: 'תל אביב–יפו',
  address: 'רחוב הדוגמה 1, תל אביב–יפו',
  link: { url: 'https://example.com/demo/1', kind: 'official_site' },
  priceEstimate: { min: 100, max: 150, currency: 'ILS', sourceIds: ['s1'] },
  matchSummary: { mismatchCount: 0, unknownCount: 0 },
  parameters: [],
  deviations: [],
  uncertainties: [],
  perParticipantReasons: [{ token: 'p1', text: 'הסבר אישי סודי עבור המשתתף' }],
  groupReason: 'מתאימה לכל ההעדפות שנבחרו',
  ratingsBySource: [],
  sourceIds: ['s1'],
}

describe('share text', () => {
  const items = [restaurant, { ...restaurant, restaurantId: 'demo-2', name: 'דוגמה: סושי', link: null }]
  const text = buildPublicShareText(base.visitAt, items.map(toPublicShareItem), 'live')

  it('uses the approved format with continuous numbering', () => {
    expect(text).toBe(
      [
        'המלצות למסעדה ליציאה ב־29.10.2026, 20:00',
        '',
        '1. דוגמה: טרטוריה — תל אביב–יפו',
        'מתאימה לכל ההעדפות שנבחרו',
        'https://example.com/demo/1',
        '',
        '2. דוגמה: סושי — תל אביב–יפו',
        'מתאימה לכל ההעדפות שנבחרו',
      ].join('\n'),
    )
  })

  it('contains no names, tokens, personal reasons or origin', () => {
    const shared = buildPublicShareText(travel.visitAt, items.map(toPublicShareItem), 'live')
    expect(shared).not.toMatch(/\bp\d+\b/)
    expect(shared).not.toContain('הסבר אישי')
    expect(shared).not.toContain('הרצל')
    expect(shared).not.toContain('דנה')
    expect(Object.keys(toPublicShareItem(restaurant)).sort()).toEqual(['city', 'groupReason', 'linkUrl', 'name'])
  })

  it('marks demo data', () => {
    expect(buildPublicShareText(base.visitAt, [], 'demo')).toContain(DEMO_SHARE_NOTE)
    expect(text).not.toContain(DEMO_SHARE_NOTE)
  })

  it('formats the visit time', () => {
    expect(formatVisitLocal('2026-01-05T09:30')).toBe('05.01.2026, 09:30')
  })
})

describe('response schema', () => {
  const response = {
    requestId: 'req-1',
    dataSource: 'demo',
    searchedAt: '2026-10-25T10:00:00.000Z',
    restaurants: [restaurant],
    fewerResultsReason: 'fewer_than_five',
    publicShareText: 'x',
    sources: [{ id: 's1', title: 'מקור', url: 'https://example.com/s1' }],
  }

  it('accepts a valid response', () => {
    expect(RecommendationsResponseSchema.safeParse(response).success).toBe(true)
  })

  it('rejects non-https links and image fields', () => {
    const bad = { ...restaurant, link: { url: 'javascript:alert(1)', kind: 'official_site' } }
    expect(RecommendationsResponseSchema.safeParse({ ...response, restaurants: [bad] }).success).toBe(false)
    const img = { ...restaurant, imageUrl: 'https://example.com/a.jpg' }
    expect(RecommendationsResponseSchema.safeParse({ ...response, restaurants: [img] }).success).toBe(false)
  })

  it('rejects more than five restaurants', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ ...restaurant, restaurantId: `r${i}` }))
    expect(RecommendationsResponseSchema.safeParse({ ...response, restaurants: six }).success).toBe(false)
  })
})
