import {
  AREAS,
  ATMOSPHERES,
  BUDGET_RANGES,
  MAX_ATMOSPHERES,
  type Atmosphere,
  type BudgetRange,
  type Kosher,
  type OriginSource,
  type SearchMode,
  type TravelMinutes,
} from '../catalogs/outing'
import { toggleInOrder } from './chips'
import { defaultVisit, isPastVisit, type LocalDateTime } from './visitTime'

export const ADDRESS_MAX = 200

export interface GeoPoint {
  lat: number
  lng: number
}

/** Shared outing settings (screen 04). Memory only. */
export interface OutingSettings {
  visit: LocalDateTime
  searchMode: SearchMode
  originSource: OriginSource
  currentLocation: GeoPoint | null
  manualAddress: string
  maxTravelMinutes: TravelMinutes
  areaIds: string[]
  /** Empty = "לא משנה". */
  budgetRanges: BudgetRange[]
  kosher: Kosher
  /** Empty = "לא משנה". At most two. */
  atmospheres: Atmosphere[]
}

export function defaultSettings(now: Date): OutingSettings {
  return {
    visit: defaultVisit(now),
    searchMode: 'travel_time',
    // No location permission request until the user picks "current location".
    originSource: 'manual_address',
    currentLocation: null,
    manualAddress: '',
    maxTravelMinutes: 30,
    areaIds: [],
    budgetRanges: [],
    kosher: 'indifferent',
    atmospheres: [],
  }
}

export function toggleBudget(current: BudgetRange[], id: BudgetRange): BudgetRange[] {
  return toggleInOrder(
    current,
    id,
    BUDGET_RANGES.map((b) => b.id),
  )
}

export function toggleAtmosphere(current: Atmosphere[], id: Atmosphere): Atmosphere[] {
  return toggleInOrder(
    current,
    id,
    ATMOSPHERES.map((a) => a.id),
    MAX_ATMOSPHERES,
  )
}

export function toggleArea(current: string[], id: string): string[] {
  return toggleInOrder(
    current,
    id,
    AREAS.map((a) => a.id),
  )
}

/** Why the search button is blocked; null when the settings are complete. */
export type SettingsIssue = 'past_visit' | 'no_area' | 'no_origin'

export function hasOrigin(s: OutingSettings): boolean {
  return s.originSource === 'current_location' ? s.currentLocation !== null : s.manualAddress.trim().length > 0
}

export function settingsIssues(s: OutingSettings, now: Date): SettingsIssue[] {
  const issues: SettingsIssue[] = []
  if (isPastVisit(s.visit, now)) issues.push('past_visit')
  if (s.searchMode === 'areas' && s.areaIds.length === 0) issues.push('no_area')
  if (s.searchMode === 'travel_time' && !hasOrigin(s)) issues.push('no_origin')
  return issues
}
