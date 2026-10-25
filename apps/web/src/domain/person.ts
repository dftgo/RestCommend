import { dietLabel, foodTypeLabel, FOOD_TYPES, INDIFFERENT_LABEL, type Diet } from '../catalogs/foodTypes'
import { toggleInOrder } from './chips'

export const FOOD_TEXT_MAX = 200

export interface Person {
  id: string
  displayName: string
  /** Normalized name used for the uniqueness check. */
  nameKey: string
  /** Empty list means "doesn't matter". */
  foodTypes: string[]
  foodText: string
  diet: Diet
  createdAt: number
  updatedAt: number
}

/** Editable fields of a profile (what the form holds). */
export interface PersonDraft {
  displayName: string
  foodTypes: string[]
  foodText: string
  diet: Diet
}

export const EMPTY_DRAFT: PersonDraft = {
  displayName: '',
  foodTypes: [],
  foodText: '',
  diet: 'indifferent',
}

export function cleanName(name: string): string {
  return name.trim()
}

export function nameKeyOf(name: string): string {
  return cleanName(name).toLocaleLowerCase()
}

export function isNameEmpty(name: string): boolean {
  return cleanName(name).length === 0
}

/**
 * Multi-select toggle for food types. "Doesn't matter" is represented
 * by an empty list, so choosing it simply clears the field.
 */
export function toggleFoodType(current: string[], id: string): string[] {
  // Keep catalog order for a stable summary.
  return toggleInOrder(
    current,
    id,
    FOOD_TYPES.map((f) => f.id),
  )
}

export function sanitizeDraft(draft: PersonDraft): PersonDraft {
  const known = new Set<string>(FOOD_TYPES.map((f) => f.id))
  return {
    displayName: cleanName(draft.displayName),
    foodTypes: draft.foodTypes.filter((id) => known.has(id)),
    foodText: draft.foodText.slice(0, FOOD_TEXT_MAX),
    diet: draft.diet,
  }
}

export function draftOf(p: Person): PersonDraft {
  return { displayName: p.displayName, foodTypes: [...p.foodTypes], foodText: p.foodText, diet: p.diet }
}

/** Short summary shown on the participant card, e.g. "איטלקי, צמחוני". */
export function summarizePerson(p: Pick<Person, 'foodTypes' | 'diet'>): string {
  const parts = p.foodTypes.map(foodTypeLabel).filter((x): x is string => Boolean(x))
  if (parts.length === 0) parts.push(INDIFFERENT_LABEL)
  if (p.diet !== 'indifferent') {
    const d = dietLabel(p.diet)
    if (d) parts.push(d)
  }
  return parts.join(', ')
}
