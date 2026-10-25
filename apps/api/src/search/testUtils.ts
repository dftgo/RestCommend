// Test helpers (used by *.test.ts only).
import type { SearchRequest } from '@restcommend/contracts'
import type { Evaluation } from './matchEvaluator'
import type { Candidate } from './researchProvider'

export function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    restaurantId: 'r',
    name: 'דוגמה: מסעדה',
    city: 'תל אביב–יפו',
    address: 'רחוב 1, תל אביב–יפו',
    areaId: 'tel_aviv_yafo',
    cuisines: ['italian'],
    menuKeywords: ['פסטה'],
    priceEstimate: { min: 100, max: 160 },
    kosher: 'unknown',
    atmospheres: ['family'],
    vegetarianOptions: 'yes',
    veganOptions: 'unknown',
    openingHours: null,
    ratings: [],
    primaryRating: { value: 4, reviewCount: 100 },
    travelMinutes: null,
    travelNote: 'נתוני דוגמה',
    link: { url: 'https://example.com/r', kind: 'official_site' },
    sourceIds: [],
    ...overrides,
  }
}

/** An evaluation with given counts (for ranking tests). */
export function evaluation(
  id: string,
  mismatchCount: number,
  unknownCount: number,
  rating: [number, number] | null,
  severity = mismatchCount,
): Evaluation {
  return {
    candidate: candidate({ restaurantId: id, primaryRating: rating ? { value: rating[0], reviewCount: rating[1] } : null }),
    parameters: [],
    mismatchCount,
    unknownCount,
    severity,
  }
}

export function request(overrides: Partial<SearchRequest> = {}): SearchRequest {
  return {
    requestId: 'req-1',
    participants: [{ token: 'p1', foodMode: 'use_saved', foodTypes: ['italian'], diet: 'indifferent' }],
    sharedFilters: { budgetRanges: 'indifferent', kosher: 'indifferent', atmospheres: 'indifferent' },
    visitAt: { local: '2026-10-29T20:00', timeZone: 'Asia/Jerusalem', utc: '2026-10-29T18:00:00.000Z' },
    searchMode: 'areas',
    areaIds: ['tel_aviv_yafo'],
    excludedRestaurantIds: [],
    ...overrides,
  }
}
