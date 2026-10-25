import { describe, expect, it } from 'vitest'
import type { Diet } from '../catalogs/foodTypes'
import type { OutingFood } from './outingFood'
import { defaultSettings, type OutingSettings } from './outingSettings'
import { buildSearchRequest } from './searchRequest'

const now = new Date('2026-10-24T15:00:00Z')

const people = [
  { id: 'id-dana-123', displayName: 'דנה', foodTypes: ['italian'], foodText: 'פסטה', diet: 'vegetarian' as Diet },
  { id: 'id-itay-456', displayName: 'Itay איתי', foodTypes: ['meat', 'asian'], foodText: '', diet: 'indifferent' as Diet },
  { id: 'id-noa-789', displayName: 'נועה', foodTypes: ['fish'], foodText: 'בלי חריף', diet: 'vegan' as Diet },
  { id: 'id-yoav-000', displayName: 'יואב', foodTypes: [], foodText: '', diet: 'indifferent' as Diet },
]

const foodByPerson: Record<string, OutingFood> = {
  'id-itay-456': { mode: 'specific', foodTypes: ['sushi'], text: 'משהו קליל' },
  'id-noa-789': { mode: 'indifferent', foodTypes: [], text: '' },
}

const travel: OutingSettings = {
  ...defaultSettings(now),
  visit: { date: '2026-10-29', time: '20:00' },
  manualAddress: ' רחוב הרצל 1, חיפה ',
  budgetRanges: ['100to200', '200to300'],
  kosher: 'at_least_no_pork_seafood',
  atmospheres: ['family', 'quiet'],
}

function build(settings: OutingSettings = travel) {
  return buildSearchRequest({ participants: people, foodByPerson, settings, requestId: 'req-1' })
}

describe('search request', () => {
  it('uses temporary tokens in screen-01 order and keeps the map on the device', () => {
    const { request, participantMap } = build()
    expect(request.participants.map((p) => p.token)).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(participantMap).toEqual({
      p1: 'id-dana-123',
      p2: 'id-itay-456',
      p3: 'id-noa-789',
      p4: 'id-yoav-000',
    })
  })

  it('contains no names and no profile ids', () => {
    const json = JSON.stringify(build().request)
    for (const p of people) {
      expect(json).not.toContain(p.displayName)
      expect(json).not.toContain(p.id)
    }
    expect(json).not.toContain('Itay')
    expect(json).not.toContain('displayName')
  })

  it('applies precedence per participant and always sends profile text and diet', () => {
    const [dana, itay, noa, yoav] = build().request.participants
    expect(dana).toEqual({ token: 'p1', foodMode: 'use_saved', foodTypes: ['italian'], profileText: 'פסטה', diet: 'vegetarian' })
    expect(itay).toEqual({ token: 'p2', foodMode: 'specific', foodTypes: ['sushi'], outingText: 'משהו קליל', diet: 'indifferent' })
    expect(noa).toEqual({ token: 'p3', foodMode: 'indifferent', foodTypes: [], profileText: 'בלי חריף', diet: 'vegan' })
    expect(yoav).toEqual({ token: 'p4', foodMode: 'use_saved', foodTypes: [], diet: 'indifferent' })
  })

  it('holds the shared settings once, at request level', () => {
    const { request } = build()
    expect(request.sharedFilters).toEqual({
      budgetRanges: ['100to200', '200to300'],
      kosher: 'at_least_no_pork_seafood',
      atmospheres: ['family', 'quiet'],
    })
    for (const p of request.participants) {
      expect(Object.keys(p)).not.toContain('sharedFilters')
      expect(Object.keys(p)).not.toContain('budgetRanges')
    }
  })

  it('sends "doesn\'t matter" for empty budget and atmosphere', () => {
    const { request } = build({ ...travel, budgetRanges: [], atmospheres: [] })
    expect(request.sharedFilters.budgetRanges).toBe('indifferent')
    expect(request.sharedFilters.atmospheres).toBe('indifferent')
  })

  it('travel-time mode has origin and max minutes, no areas', () => {
    const { request } = build()
    expect(request.searchMode).toBe('travel_time')
    expect(request.origin).toEqual({ kind: 'manual_address', text: 'רחוב הרצל 1, חיפה' })
    expect(request.maxTravelMinutes).toBe(30)
    expect(request).not.toHaveProperty('areaIds')
  })

  it('travel-time mode can use the current location', () => {
    const { request } = build({
      ...travel,
      originSource: 'current_location',
      currentLocation: { lat: 32.79, lng: 34.99 },
      maxTravelMinutes: 45,
    })
    expect(request.origin).toEqual({ kind: 'current_location', lat: 32.79, lng: 34.99 })
    expect(request.maxTravelMinutes).toBe(45)
  })

  it('areas mode has areas and no origin or max minutes', () => {
    const { request } = build({
      ...travel,
      searchMode: 'areas',
      areaIds: ['sharon', 'gush_dan'],
      currentLocation: { lat: 1, lng: 2 },
    })
    expect(request.areaIds).toEqual(['sharon', 'gush_dan'])
    expect(request).not.toHaveProperty('origin')
    expect(request).not.toHaveProperty('maxTravelMinutes')
    expect(JSON.stringify(request)).not.toContain('הרצל')
  })

  it('stores the visit time with Asia/Jerusalem', () => {
    expect(build().request.visitAt).toEqual({
      local: '2026-10-29T20:00',
      timeZone: 'Asia/Jerusalem',
      utc: '2026-10-29T18:00:00.000Z',
    })
  })

  it('has no parking field and no excluded restaurants yet', () => {
    const { request } = build()
    expect(JSON.stringify(request).toLowerCase()).not.toContain('parking')
    expect(request.excludedRestaurantIds).toEqual([])
  })

  it('includes only the selected participants', () => {
    const { request } = buildSearchRequest({
      participants: [people[2]],
      foodByPerson,
      settings: travel,
      requestId: 'req-2',
    })
    expect(request.participants).toHaveLength(1)
    expect(request.participants[0].token).toBe('p1')
  })
})
