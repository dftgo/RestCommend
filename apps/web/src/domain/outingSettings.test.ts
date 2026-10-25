import { describe, expect, it } from 'vitest'
import { defaultSettings, settingsIssues, toggleArea, toggleAtmosphere, toggleBudget } from './outingSettings'

const now = new Date('2026-10-24T15:00:00Z')

describe('shared settings', () => {
  it('starts with "doesn\'t matter" and 30 minutes, without asking for location', () => {
    const s = defaultSettings(now)
    expect(s.budgetRanges).toEqual([])
    expect(s.atmospheres).toEqual([])
    expect(s.kosher).toBe('indifferent')
    expect(s.maxTravelMinutes).toBe(30)
    expect(s.searchMode).toBe('travel_time')
    expect(s.originSource).toBe('manual_address')
  })

  it('allows several budget ranges in catalog order', () => {
    let b = toggleBudget([], '300to400')
    b = toggleBudget(b, 'upTo100')
    expect(b).toEqual(['upTo100', '300to400'])
    expect(toggleBudget(b, 'upTo100')).toEqual(['300to400'])
  })

  it('allows up to two atmospheres and never a third', () => {
    let a = toggleAtmosphere([], 'quiet')
    a = toggleAtmosphere(a, 'romantic')
    expect(a).toEqual(['romantic', 'quiet'])
    expect(toggleAtmosphere(a, 'family')).toEqual(['romantic', 'quiet'])
    expect(toggleAtmosphere(a, 'quiet')).toEqual(['romantic'])
  })

  it('allows several areas', () => {
    expect(toggleArea(toggleArea([], 'sharon'), 'tel_aviv_yafo')).toEqual(['sharon', 'tel_aviv_yafo'])
  })
})

describe('settings validation', () => {
  it('needs an origin in travel-time mode', () => {
    const s = defaultSettings(now)
    expect(settingsIssues(s, now)).toEqual(['no_origin'])
    expect(settingsIssues({ ...s, manualAddress: '   ' }, now)).toEqual(['no_origin'])
    expect(settingsIssues({ ...s, manualAddress: 'דיזנגוף 50, תל אביב' }, now)).toEqual([])
    const loc = { ...s, originSource: 'current_location' as const }
    expect(settingsIssues(loc, now)).toEqual(['no_origin'])
    expect(settingsIssues({ ...loc, currentLocation: { lat: 32.08, lng: 34.78 } }, now)).toEqual([])
  })

  it('needs at least one area in areas mode, and no origin', () => {
    const s = { ...defaultSettings(now), searchMode: 'areas' as const }
    expect(settingsIssues(s, now)).toEqual(['no_area'])
    expect(settingsIssues({ ...s, areaIds: ['sharon'] }, now)).toEqual([])
  })

  it('blocks a visit time that already passed', () => {
    const s = { ...defaultSettings(now), manualAddress: 'חיפה', visit: { date: '2026-10-24', time: '17:00' } }
    expect(settingsIssues(s, now)).toEqual(['past_visit'])
  })
})
