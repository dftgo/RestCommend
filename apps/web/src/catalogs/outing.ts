// Editable catalogs for the shared outing settings (screen 04).
// IDs are stable and sent in the search request; labels are UI only.
import type { CatalogItem } from './foodTypes'

export const AREAS: CatalogItem[] = [
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

export type BudgetRange = 'upTo100' | '100to200' | '200to300' | '300to400' | 'over400'

export const BUDGET_RANGES: CatalogItem<BudgetRange>[] = [
  { id: 'upTo100', label: 'עד 100 ₪' },
  { id: '100to200', label: '100–200 ₪' },
  { id: '200to300', label: '200–300 ₪' },
  { id: '300to400', label: '300–400 ₪' },
  { id: 'over400', label: '400 ₪ ומעלה' },
]

export type Kosher = 'certified' | 'at_least_no_pork_seafood' | 'indifferent'

export const KOSHER_OPTIONS: CatalogItem<Kosher>[] = [
  { id: 'certified', label: 'כשר עם תעודה' },
  { id: 'at_least_no_pork_seafood', label: 'לפחות ללא חזיר ופירות ים' },
  { id: 'indifferent', label: 'לא משנה' },
]

export type Atmosphere = 'romantic' | 'family' | 'lively' | 'quiet' | 'business'

export const ATMOSPHERES: CatalogItem<Atmosphere>[] = [
  { id: 'romantic', label: 'רומנטית' },
  { id: 'family', label: 'משפחתית' },
  { id: 'lively', label: 'תוססת' },
  { id: 'quiet', label: 'שקטה' },
  { id: 'business', label: 'עסקית' },
]

export const MAX_ATMOSPHERES = 2

export type TravelMinutes = 15 | 30 | 45 | 60

export const TRAVEL_MINUTES: TravelMinutes[] = [15, 30, 45, 60]

export type SearchMode = 'travel_time' | 'areas'

export const SEARCH_MODES: CatalogItem<SearchMode>[] = [
  { id: 'travel_time', label: 'לפי זמן נסיעה' },
  { id: 'areas', label: 'לפי ערים / אזורים' },
]

export type OriginSource = 'current_location' | 'manual_address'

export const ORIGIN_SOURCES: CatalogItem<OriginSource>[] = [
  { id: 'current_location', label: 'המיקום הנוכחי' },
  { id: 'manual_address', label: 'כתובת ידנית' },
]
