import { describe, expect, it } from 'vitest'
import { effectiveFood, isOutingFoodValid, pruneFoodMap, savedFoodSummary, type OutingFood } from './outingFood'

const profile = { foodTypes: ['italian', 'sushi'], foodText: 'אוהבת פסטה עם פטריות', diet: 'vegetarian' as const }

describe('outing food precedence', () => {
  it('skip uses the saved profile', () => {
    const r = effectiveFood(profile, { mode: 'use_saved', foodTypes: ['meat'], text: 'בשר' })
    expect(r.foodMode).toBe('use_saved')
    expect(r.foodTypes).toEqual(['italian', 'sushi'])
    expect(r.outingText).toBeUndefined()
  })

  it('the outing choice replaces the profile food types', () => {
    const r = effectiveFood(profile, { mode: 'specific', foodTypes: ['meat'], text: ' סטייק טוב ' })
    expect(r.foodTypes).toEqual(['meat'])
    expect(r.outingText).toBe('סטייק טוב')
  })

  it('"doesn\'t matter" removes the food type preference', () => {
    const r = effectiveFood(profile, { mode: 'indifferent', foodTypes: ['meat'], text: 'x' })
    expect(r.foodTypes).toEqual([])
    expect(r.outingText).toBeUndefined()
  })

  it('always sends the profile text and diet, in every mode', () => {
    for (const mode of ['use_saved', 'specific', 'indifferent'] as const) {
      const r = effectiveFood(profile, { mode, foodTypes: ['fish'], text: '' })
      expect(r.profileText).toBe(profile.foodText)
      expect(r.diet).toBe('vegetarian')
    }
  })

  it('skip and "doesn\'t matter" give different results', () => {
    const skip = effectiveFood(profile, { mode: 'use_saved', foodTypes: [], text: '' })
    const none = effectiveFood(profile, { mode: 'indifferent', foodTypes: [], text: '' })
    expect(skip).not.toEqual(none)
  })

  it('does not change the profile', () => {
    const p = { ...profile, foodTypes: [...profile.foodTypes] }
    const snapshot = JSON.stringify(p)
    const r = effectiveFood(p, { mode: 'specific', foodTypes: ['meat'], text: 'x' })
    r.foodTypes.push('fish')
    expect(JSON.stringify(p)).toBe(snapshot)
  })
})

describe('"בחירה לערב" validation', () => {
  const specific = (foodTypes: string[], text: string): OutingFood => ({ mode: 'specific', foodTypes, text })

  it('blocks an empty choice', () => {
    expect(isOutingFoodValid(specific([], ''))).toBe(false)
    expect(isOutingFoodValid(specific([], '   '))).toBe(false)
  })

  it('accepts a food type or text', () => {
    expect(isOutingFoodValid(specific(['sushi'], ''))).toBe(true)
    expect(isOutingFoodValid(specific([], 'משהו חריף'))).toBe(true)
  })

  it('other modes are always valid', () => {
    expect(isOutingFoodValid({ mode: 'use_saved', foodTypes: [], text: '' })).toBe(true)
    expect(isOutingFoodValid({ mode: 'indifferent', foodTypes: [], text: '' })).toBe(true)
  })
})

describe('helpers', () => {
  it('summarizes saved food types without the diet', () => {
    expect(savedFoodSummary({ foodTypes: ['italian', 'sushi'] })).toBe('איטלקי, סושי')
    expect(savedFoodSummary({ foodTypes: [] })).toBe('לא משנה')
  })

  it('drops input of deleted profiles', () => {
    const food: OutingFood = { mode: 'indifferent', foodTypes: [], text: '' }
    expect(pruneFoodMap({ a: food, b: food }, ['a'])).toEqual({ a: food })
    const same = { a: food }
    expect(pruneFoodMap(same, ['a', 'b'])).toBe(same)
  })
})
