import { describe, expect, it } from 'vitest'
import { FOOD_TEXT_MAX, isNameEmpty, nameKeyOf, sanitizeDraft, summarizePerson, toggleFoodType } from './person'

describe('name rules', () => {
  it('treats blank or whitespace-only names as empty', () => {
    expect(isNameEmpty('')).toBe(true)
    expect(isNameEmpty('   ')).toBe(true)
    expect(isNameEmpty(' דנה ')).toBe(false)
  })

  it('normalizes edges and letter case for the uniqueness key', () => {
    expect(nameKeyOf('  Dana ')).toBe(nameKeyOf('dana'))
    expect(nameKeyOf(' דנה')).toBe(nameKeyOf('דנה '))
    expect(nameKeyOf('דנה')).not.toBe(nameKeyOf('דנה כהן'))
  })
})

describe('food type chips', () => {
  it('allows several food types', () => {
    let types: string[] = []
    types = toggleFoodType(types, 'sushi')
    types = toggleFoodType(types, 'italian')
    expect(types).toEqual(['italian', 'sushi'])
  })

  it('deselects a selected type', () => {
    expect(toggleFoodType(['italian', 'sushi'], 'italian')).toEqual(['sushi'])
  })

  it('represents "doesn\'t matter" as an empty list, so choosing a type leaves it', () => {
    const indifferent: string[] = []
    expect(toggleFoodType(indifferent, 'meat')).toEqual(['meat'])
  })
})

describe('sanitizeDraft', () => {
  it('trims the name, caps free text and drops unknown types', () => {
    const clean = sanitizeDraft({
      displayName: '  Noa  ',
      foodTypes: ['fish', 'not-a-type'],
      foodText: 'א'.repeat(FOOD_TEXT_MAX + 30),
      diet: 'vegan',
    })
    expect(clean.displayName).toBe('Noa')
    expect(clean.foodTypes).toEqual(['fish'])
    expect(clean.foodText).toHaveLength(FOOD_TEXT_MAX)
  })
})

describe('summarizePerson', () => {
  it('lists food types and diet', () => {
    expect(summarizePerson({ foodTypes: ['italian'], diet: 'vegetarian' })).toBe('איטלקי, צמחוני')
  })

  it('shows "doesn\'t matter" when no type was chosen', () => {
    expect(summarizePerson({ foodTypes: [], diet: 'indifferent' })).toBe('לא משנה')
    expect(summarizePerson({ foodTypes: [], diet: 'vegan' })).toBe('לא משנה, טבעוני')
  })
})
