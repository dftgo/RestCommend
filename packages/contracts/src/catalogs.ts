// Editable catalogs shared by the app and the server.
// IDs are stable and travel in the API; labels are Hebrew UI text.

export interface CatalogItem<T extends string = string> {
  id: T
  label: string
}

export const INDIFFERENT_LABEL = 'לא משנה'

// ---------- Food ----------

export const FOOD_TYPE_IDS = ['italian', 'asian', 'meat', 'fish', 'sushi', 'mediterranean'] as const
export type FoodTypeId = (typeof FOOD_TYPE_IDS)[number]

export const FOOD_TYPES: CatalogItem<FoodTypeId>[] = [
  { id: 'italian', label: 'איטלקי' },
  { id: 'asian', label: 'אסייתי' },
  { id: 'meat', label: 'בשר' },
  { id: 'fish', label: 'דגים' },
  { id: 'sushi', label: 'סושי' },
  { id: 'mediterranean', label: 'ים־תיכוני' },
]

export const DIET_IDS = ['vegetarian', 'vegan', 'indifferent'] as const
export type Diet = (typeof DIET_IDS)[number]

export const DIETS: CatalogItem<Diet>[] = [
  { id: 'vegetarian', label: 'צמחוני' },
  { id: 'vegan', label: 'טבעוני' },
  { id: 'indifferent', label: INDIFFERENT_LABEL },
]

/** use_saved = skip (use the profile); specific = "בחירה לערב"; indifferent = "לא משנה". */
export const FOOD_MODE_IDS = ['use_saved', 'specific', 'indifferent'] as const
export type FoodMode = (typeof FOOD_MODE_IDS)[number]

// ---------- Outing settings ----------

export const AREA_IDS = [
  'galilee_valleys',
  'haifa_krayot',
  'carmel_coast_hadera',
  'sharon',
  'tel_aviv_yafo',
  'gush_dan',
  'shfela',
  'jerusalem_area',
  'beer_sheva_negev',
  'eilat',
] as const
export type AreaId = (typeof AREA_IDS)[number]

export const AREAS: CatalogItem<AreaId>[] = [
  { id: 'galilee_valleys', label: 'גליל ועמקים' },
  { id: 'haifa_krayot', label: 'חיפה והקריות' },
  { id: 'carmel_coast_hadera', label: 'חוף הכרמל וחדרה' },
  { id: 'sharon', label: 'שרון' },
  { id: 'tel_aviv_yafo', label: 'תל אביב–יפו' },
  { id: 'gush_dan', label: 'גוש דן' },
  { id: 'shfela', label: 'שפלה' },
  { id: 'jerusalem_area', label: 'ירושלים והסביבה' },
  { id: 'beer_sheva_negev', label: 'באר שבע והנגב' },
  { id: 'eilat', label: 'אילת' },
]

export const BUDGET_RANGE_IDS = ['upTo100', '100to200', '200to300', '300to400', 'over400'] as const
export type BudgetRange = (typeof BUDGET_RANGE_IDS)[number]

export const BUDGET_RANGES: CatalogItem<BudgetRange>[] = [
  { id: 'upTo100', label: 'עד 100 ₪' },
  { id: '100to200', label: '100–200 ₪' },
  { id: '200to300', label: '200–300 ₪' },
  { id: '300to400', label: '300–400 ₪' },
  { id: 'over400', label: '400 ₪ ומעלה' },
]

/** Price bounds per person in ILS: low < x <= high (upTo100 also includes 0). */
export const BUDGET_BOUNDS: Record<BudgetRange, { low: number; high: number }> = {
  upTo100: { low: -1, high: 100 },
  '100to200': { low: 100, high: 200 },
  '200to300': { low: 200, high: 300 },
  '300to400': { low: 300, high: 400 },
  over400: { low: 400, high: Number.POSITIVE_INFINITY },
}

export const KOSHER_IDS = ['certified', 'at_least_no_pork_seafood', 'indifferent'] as const
export type Kosher = (typeof KOSHER_IDS)[number]

export const KOSHER_OPTIONS: CatalogItem<Kosher>[] = [
  { id: 'certified', label: 'כשר עם תעודה' },
  { id: 'at_least_no_pork_seafood', label: 'לפחות ללא חזיר ופירות ים' },
  { id: 'indifferent', label: INDIFFERENT_LABEL },
]

export const ATMOSPHERE_IDS = ['romantic', 'family', 'lively', 'quiet', 'business'] as const
export type Atmosphere = (typeof ATMOSPHERE_IDS)[number]

export const ATMOSPHERES: CatalogItem<Atmosphere>[] = [
  { id: 'romantic', label: 'רומנטית' },
  { id: 'family', label: 'משפחתית' },
  { id: 'lively', label: 'תוססת' },
  { id: 'quiet', label: 'שקטה' },
  { id: 'business', label: 'עסקית' },
]

export const MAX_ATMOSPHERES = 2

export const TRAVEL_MINUTES = [15, 30, 45, 60] as const
export type TravelMinutes = (typeof TRAVEL_MINUTES)[number]

export const SEARCH_MODE_IDS = ['travel_time', 'areas'] as const
export type SearchMode = (typeof SEARCH_MODE_IDS)[number]

export const SEARCH_MODES: CatalogItem<SearchMode>[] = [
  { id: 'travel_time', label: 'לפי זמן נסיעה' },
  { id: 'areas', label: 'לפי ערים / אזורים' },
]

export type OriginSource = 'current_location' | 'manual_address'

export const ORIGIN_SOURCES: CatalogItem<OriginSource>[] = [
  { id: 'current_location', label: 'המיקום הנוכחי' },
  { id: 'manual_address', label: 'כתובת ידנית' },
]

/** Limits shared by the app and the server. */
export const LIMITS = {
  minParticipants: 1,
  maxParticipants: 10,
  freeText: 200,
  address: 200,
  maxExcluded: 100,
  maxResults: 5,
} as const

// ---------- Helpers ----------

function labelOf<T extends string>(items: CatalogItem<T>[], id: string): string | undefined {
  return items.find((x) => x.id === id)?.label
}

export const foodTypeLabel = (id: string) => labelOf(FOOD_TYPES, id)
export const dietLabel = (id: string) => labelOf(DIETS, id)
export const areaLabel = (id: string) => labelOf(AREAS, id)
export const atmosphereLabel = (id: string) => labelOf(ATMOSPHERES, id)

export const isFoodTypeId = (id: string): id is FoodTypeId => (FOOD_TYPE_IDS as readonly string[]).includes(id)
export const isAreaId = (id: string): id is AreaId => (AREA_IDS as readonly string[]).includes(id)
