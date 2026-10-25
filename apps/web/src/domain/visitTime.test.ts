import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultVisit, israelLocal, israelLocalToUtc, isPastVisit, visitAtOf } from './visitTime'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('visit time in Israel', () => {
  it('converts winter time (UTC+2)', () => {
    expect(israelLocalToUtc({ date: '2026-10-29', time: '20:00' }).toISOString()).toBe('2026-10-29T18:00:00.000Z')
  })

  it('converts summer time (UTC+3)', () => {
    expect(israelLocalToUtc({ date: '2026-07-15', time: '20:00' }).toISOString()).toBe('2026-07-15T17:00:00.000Z')
  })

  it('does not depend on the device time zone', () => {
    vi.stubEnv('TZ', 'America/New_York')
    // Sanity check that the device time zone really changed.
    expect(new Date('2026-10-29T18:00:00Z').getHours()).toBe(14)
    expect(israelLocalToUtc({ date: '2026-10-29', time: '20:00' }).toISOString()).toBe('2026-10-29T18:00:00.000Z')
    expect(israelLocal(new Date('2026-10-29T18:00:00Z'))).toEqual({ date: '2026-10-29', time: '20:00' })
    vi.stubEnv('TZ', 'Asia/Tokyo')
    expect(israelLocalToUtc({ date: '2026-07-15', time: '09:30' }).toISOString()).toBe('2026-07-15T06:30:00.000Z')
  })

  it('stores the visit with the Asia/Jerusalem time zone and UTC', () => {
    expect(visitAtOf({ date: '2026-10-29', time: '20:00' })).toEqual({
      local: '2026-10-29T20:00',
      timeZone: 'Asia/Jerusalem',
      utc: '2026-10-29T18:00:00.000Z',
    })
  })

  it('detects a visit that already passed', () => {
    const now = new Date('2026-10-24T15:00:00Z') // 18:00 in Israel
    expect(isPastVisit({ date: '2026-10-24', time: '17:59' }, now)).toBe(true)
    expect(isPastVisit({ date: '2026-10-24', time: '18:00' }, now)).toBe(true)
    expect(isPastVisit({ date: '2026-10-24', time: '18:01' }, now)).toBe(false)
    expect(isPastVisit({ date: '2026-10-23', time: '23:00' }, now)).toBe(true)
    expect(isPastVisit({ date: '2026-10-29', time: '20:00' }, now)).toBe(false)
  })

  it('treats an incomplete value as not valid', () => {
    const now = new Date('2026-10-24T15:00:00Z')
    expect(isPastVisit({ date: '', time: '20:00' }, now)).toBe(true)
    expect(isPastVisit({ date: '2026-10-29', time: '' }, now)).toBe(true)
  })

  it('defaults to the next round hour today', () => {
    expect(defaultVisit(new Date('2026-10-24T15:20:00Z'))).toEqual({ date: '2026-10-24', time: '19:00' })
    expect(defaultVisit(new Date('2026-10-24T20:30:00Z'))).toEqual({ date: '2026-10-25', time: '00:00' })
    const now = new Date('2026-10-24T15:20:00Z')
    expect(isPastVisit(defaultVisit(now), now)).toBe(false)
  })
})
