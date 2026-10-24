// Editable catalogs. IDs are stable; labels are what the UI shows.

export interface CatalogItem<T extends string = string> {
  id: T
  label: string
}

export const FOOD_TYPES: CatalogItem[] = [
  { id: 'italian', label: 'איטלקי' },
  { id: 'asian', label: 'אסייתי' },
  { id: 'meat', label: 'בשר' },
  { id: 'fish', label: 'דגים' },
  { id: 'sushi', label: 'סושי' },
  { id: 'mediterranean', label: 'ים־תיכוני' },
]

export type Diet = 'vegetarian' | 'vegan' | 'indifferent'

export const DIETS: CatalogItem<Diet>[] = [
  { id: 'vegetarian', label: 'צמחוני' },
  { id: 'vegan', label: 'טבעוני' },
  { id: 'indifferent', label: 'לא משנה' },
]

export const INDIFFERENT_LABEL = 'לא משנה'

export function foodTypeLabel(id: string): string | undefined {
  return FOOD_TYPES.find((f) => f.id === id)?.label
}

export function dietLabel(diet: Diet): string | undefined {
  return DIETS.find((d) => d.id === diet)?.label
}
