import { describe, expect, it } from 'vitest'
import type { SearchRequest } from '@restcommend/contracts'
import { budgetDistance, evaluate, inBudget } from './matchEvaluator'
import { openStateAt } from './openingHours'
import { candidate, request } from './testUtils'

const statusOf = (req: SearchRequest, c = candidate(), param?: string, token?: string) =>
  evaluate(c, req, 'open').parameters.find((p) => p.param === param && (token === undefined || p.token === token))?.status

const filters = (f: Partial<SearchRequest['sharedFilters']>) =>
  request({ sharedFilters: { budgetRanges: 'indifferent', kosher: 'indifferent', atmospheres: 'indifferent', ...f } })

describe('match evaluator', () => {
  it('does not count "doesn\'t matter" parameters', () => {
    const e = evaluate(candidate(), request(), 'open')
    expect(e.parameters.map((p) => p.param).sort()).toEqual(['area', 'food', 'opening_hours'])
  })

  it('budget: midpoint inside any selected range; boundaries per catalog', () => {
    expect(inBudget(100, 'upTo100')).toBe(true)
    expect(inBudget(100, '100to200')).toBe(false)
    expect(inBudget(0, 'upTo100')).toBe(true)
    expect(inBudget(401, 'over400')).toBe(true)
    expect(statusOf(filters({ budgetRanges: ['100to200'] }), candidate({ priceEstimate: { min: 100, max: 160 } }), 'budget')).toBe('match')
    expect(statusOf(filters({ budgetRanges: ['upTo100', '300to400'] }), candidate({ priceEstimate: { min: 100, max: 160 } }), 'budget')).toBe('mismatch')
    expect(statusOf(filters({ budgetRanges: ['100to200'] }), candidate({ priceEstimate: null }), 'budget')).toBe('unknown')
  })

  it('budget gap: a small overshoot has a smaller severity than a large one', () => {
    expect(budgetDistance(220, '100to200')).toBe(20)
    expect(budgetDistance(90, '100to200')).toBe(10)
    const req = filters({ budgetRanges: ['100to200'] })
    const small = evaluate(candidate({ priceEstimate: { min: 200, max: 240 } }), req, 'open')
    const large = evaluate(candidate({ priceEstimate: { min: 350, max: 450 } }), req, 'open')
    expect(small.severity).toBeLessThan(large.severity)
  })

  it('kosher: a certified restaurant also answers the middle option', () => {
    const certified = filters({ kosher: 'certified' })
    const middle = filters({ kosher: 'at_least_no_pork_seafood' })
    expect(statusOf(middle, candidate({ kosher: 'certified' }), 'kosher')).toBe('match')
    expect(statusOf(middle, candidate({ kosher: 'no_pork_seafood' }), 'kosher')).toBe('match')
    expect(statusOf(middle, candidate({ kosher: 'serves_pork_or_seafood' }), 'kosher')).toBe('mismatch')
    expect(statusOf(certified, candidate({ kosher: 'no_pork_seafood' }), 'kosher')).toBe('mismatch')
    expect(statusOf(certified, candidate({ kosher: 'unknown' }), 'kosher')).toBe('unknown')
  })

  it('atmosphere: two choices are alternatives', () => {
    const req = filters({ atmospheres: ['romantic', 'family'] })
    expect(statusOf(req, candidate({ atmospheres: ['family'] }), 'atmosphere')).toBe('match')
    expect(statusOf(req, candidate({ atmospheres: ['business'] }), 'atmosphere')).toBe('mismatch')
    expect(statusOf(req, candidate({ atmospheres: null }), 'atmosphere')).toBe('unknown')
  })

  it('travel time: over the limit is a mismatch with a gap, missing is unknown', () => {
    const req = request({ searchMode: 'travel_time', areaIds: undefined, origin: { kind: 'manual_address', text: 'x' }, maxTravelMinutes: 30 })
    expect(statusOf(req, candidate({ travelMinutes: 25 }), 'travel_time')).toBe('match')
    expect(statusOf(req, candidate({ travelMinutes: 40 }), 'travel_time')).toBe('mismatch')
    expect(statusOf(req, candidate({ travelMinutes: null }), 'travel_time')).toBe('unknown')
    expect(evaluate(candidate({ travelMinutes: 25 }), req, 'open').parameters.some((p) => p.param === 'area')).toBe(false)
  })

  it('food: one parameter per participant; types are alternatives; text checks the menu', () => {
    const req = request({
      participants: [
        { token: 'p1', foodMode: 'use_saved', foodTypes: ['sushi', 'italian'], diet: 'indifferent' },
        { token: 'p2', foodMode: 'specific', foodTypes: ['meat'], diet: 'indifferent' },
        { token: 'p3', foodMode: 'specific', foodTypes: [], outingText: 'בא לי פסטה', diet: 'indifferent' },
        { token: 'p4', foodMode: 'specific', foodTypes: [], outingText: 'משהו קליל', diet: 'indifferent' },
        { token: 'p5', foodMode: 'indifferent', foodTypes: [], profileText: 'אוהב חריף', diet: 'indifferent' },
      ],
    })
    expect(statusOf(req, candidate(), 'food', 'p1')).toBe('match')
    expect(statusOf(req, candidate(), 'food', 'p2')).toBe('mismatch')
    expect(statusOf(req, candidate(), 'food', 'p3')).toBe('match')
    expect(statusOf(req, candidate(), 'food', 'p4')).toBe('unknown')
    expect(statusOf(req, candidate(), 'food', 'p5')).toBeUndefined()
  })

  it('diet: checked per participant; vegan dishes count as vegetarian', () => {
    const req = request({
      participants: [
        { token: 'p1', foodMode: 'indifferent', foodTypes: [], diet: 'vegetarian' },
        { token: 'p2', foodMode: 'indifferent', foodTypes: [], diet: 'vegan' },
      ],
    })
    expect(statusOf(req, candidate({ vegetarianOptions: 'unknown', veganOptions: 'yes' }), 'diet', 'p1')).toBe('match')
    expect(statusOf(req, candidate({ veganOptions: 'unknown' }), 'diet', 'p2')).toBe('unknown')
    expect(statusOf(req, candidate({ veganOptions: 'no' }), 'diet', 'p2')).toBe('mismatch')
  })

  it('unknown opening hours are an unknown parameter, not a mismatch', () => {
    const e = evaluate(candidate(), request(), 'unknown')
    expect(e.unknownCount).toBe(1)
    expect(e.mismatchCount).toBe(0)
  })
})

describe('opening hours', () => {
  const kosherStyle = {
    '4': [{ open: '12:00', close: '23:30' }],
    '5': [{ open: '11:00', close: '15:00' }],
    '6': [{ open: '20:00', close: '23:30' }],
  }
  it('finds closed and open times in Israel local time', () => {
    expect(openStateAt(kosherStyle, '2026-10-30T20:00')).toBe('closed') // Friday evening
    expect(openStateAt(kosherStyle, '2026-10-31T21:00')).toBe('open') // Saturday night
    expect(openStateAt(kosherStyle, '2026-10-29T20:00')).toBe('open') // Thursday
    expect(openStateAt(kosherStyle, '2026-11-01T20:00')).toBe('closed') // Sunday: no hours listed
    expect(openStateAt(null, '2026-10-29T20:00')).toBe('unknown')
  })

  it('handles hours past midnight', () => {
    const night = { '4': [{ open: '18:00', close: '02:00' }] }
    expect(openStateAt(night, '2026-10-29T23:30')).toBe('open') // Thursday
    expect(openStateAt(night, '2026-10-30T01:00')).toBe('open') // Friday 01:00, from Thursday
    expect(openStateAt(night, '2026-10-30T03:00')).toBe('closed')
  })
})
