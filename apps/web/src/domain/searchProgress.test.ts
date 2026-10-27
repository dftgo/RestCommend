import { describe, expect, it } from 'vitest'
import { searchProgress } from './searchProgress'

describe('searchProgress', () => {
  it('counts down to the usual minute', () => {
    expect(searchProgress(0)).toEqual({ fraction: 0, text: 'נותרו כ־60 שניות' })
    expect(searchProgress(15.7).text).toBe('נותרו כ־45 שניות')
    expect(searchProgress(59).text).toBe('עוד כמה שניות…')
  })

  it('then counts the remaining time to the 90-second limit', () => {
    expect(searchProgress(60).text).toBe('לוקח יותר מהרגיל — עד 30 שניות נוספות')
    expect(searchProgress(80).text).toBe('לוקח יותר מהרגיל — עד 10 שניות נוספות')
    expect(searchProgress(95).text).toBe('עוד רגע…')
  })

  it('fills the bar steadily and never completes it', () => {
    const values = [0, 10, 30, 59, 60, 75, 89, 90, 200].map((s) => searchProgress(s).fraction)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
    expect(searchProgress(60).fraction).toBeCloseTo(0.8)
    expect(Math.max(...values)).toBeLessThan(1)
  })
})
