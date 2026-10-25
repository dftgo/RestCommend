import type { FoodMode } from '@restcommend/contracts'
import { foodTypeLabel, INDIFFERENT_LABEL, type Diet } from '../catalogs/foodTypes'
import { FOOD_TEXT_MAX, type Person } from './person'

export type { FoodMode }

/** One participant's food choice for the current outing (screen 03). Memory only. */
export interface OutingFood {
  mode: FoodMode
  /** Used only in "specific" mode. Kept while switching modes so input is not lost. */
  foodTypes: string[]
  /** Used only in "specific" mode. */
  text: string
}

export const DEFAULT_OUTING_FOOD: OutingFood = { mode: 'use_saved', foodTypes: [], text: '' }

export const FOOD_MODES: { id: FoodMode; label: string }[] = [
  { id: 'use_saved', label: 'לפי הפרופיל' },
  { id: 'specific', label: 'בחירה לערב' },
  { id: 'indifferent', label: 'לא משנה' },
]

export function outingFoodOf(map: Record<string, OutingFood>, personId: string): OutingFood {
  return map[personId] ?? DEFAULT_OUTING_FOOD
}

/** "בחירה לערב" needs at least one food type or some text. */
export function isOutingFoodValid(food: OutingFood): boolean {
  if (food.mode !== 'specific') return true
  return food.foodTypes.length > 0 || food.text.trim().length > 0
}

/** Effective food preference after precedence rules (ARCHITECTURE 2.3). */
export interface EffectiveFood {
  foodMode: FoodMode
  foodTypes: string[]
  outingText?: string
  profileText?: string
  diet: Diet
}

export function effectiveFood(person: Pick<Person, 'foodTypes' | 'foodText' | 'diet'>, food: OutingFood): EffectiveFood {
  const profileText = person.foodText.trim().slice(0, FOOD_TEXT_MAX)
  const result: EffectiveFood = { foodMode: food.mode, foodTypes: [], diet: person.diet }

  if (food.mode === 'use_saved') {
    result.foodTypes = [...person.foodTypes]
  } else if (food.mode === 'specific') {
    // The outing choice replaces the profile's food types.
    result.foodTypes = [...food.foodTypes]
    const outingText = food.text.trim().slice(0, FOOD_TEXT_MAX)
    if (outingText) result.outingText = outingText
  }
  // Profile text and diet are always sent, whatever the mode.
  if (profileText) result.profileText = profileText
  return result
}

/** Read-only summary of the saved food preferences (diet is shown separately). */
export function savedFoodSummary(person: Pick<Person, 'foodTypes'>): string {
  const parts = person.foodTypes.map(foodTypeLabel).filter((x): x is string => Boolean(x))
  return parts.length > 0 ? parts.join(', ') : INDIFFERENT_LABEL
}

/** Remove input of profiles that no longer exist. */
export function pruneFoodMap(map: Record<string, OutingFood>, existingIds: Iterable<string>): Record<string, OutingFood> {
  const existing = new Set(existingIds)
  const keys = Object.keys(map)
  if (keys.every((k) => existing.has(k))) return map
  return Object.fromEntries(keys.filter((k) => existing.has(k)).map((k) => [k, map[k]]))
}
