// Search request sent to the server (from Milestone 3). Types move to packages/contracts in Milestone 3.
import type { Diet } from '../catalogs/foodTypes'
import type { Atmosphere, BudgetRange, Kosher, SearchMode, TravelMinutes } from '../catalogs/outing'
import { effectiveFood, outingFoodOf, type FoodMode, type OutingFood } from './outingFood'
import { ADDRESS_MAX, type OutingSettings } from './outingSettings'
import type { Person } from './person'
import { visitAtOf, type VisitAt } from './visitTime'

export interface ParticipantRequest {
  /** Temporary token (p1, p2, ...). Never a name or a profile id. */
  token: string
  foodMode: FoodMode
  /** Effective food types after precedence. Empty = no food type preference. */
  foodTypes: string[]
  /** Outing text ("בחירה לערב" only). */
  outingText?: string
  /** Profile free text; always sent, low priority. */
  profileText?: string
  /** Always sent. */
  diet: Diet
}

export type Origin = { kind: 'current_location'; lat: number; lng: number } | { kind: 'manual_address'; text: string }

export interface SearchRequest {
  requestId: string
  participants: ParticipantRequest[]
  sharedFilters: {
    budgetRanges: BudgetRange[] | 'indifferent'
    kosher: Kosher
    atmospheres: Atmosphere[] | 'indifferent'
  }
  visitAt: VisitAt
  searchMode: SearchMode
  origin?: Origin
  maxTravelMinutes?: TravelMinutes
  areaIds?: string[]
  excludedRestaurantIds: string[]
}

/** token -> person id. Stays on the device; never sent. */
export type ParticipantMap = Record<string, string>

export interface BuiltRequest {
  request: SearchRequest
  participantMap: ParticipantMap
}

export interface BuildInput {
  /** Selected participants, already in screen-01 order. */
  participants: Pick<Person, 'id' | 'foodTypes' | 'foodText' | 'diet'>[]
  foodByPerson: Record<string, OutingFood>
  settings: OutingSettings
  requestId: string
}

export function buildSearchRequest({ participants, foodByPerson, settings, requestId }: BuildInput): BuiltRequest {
  const participantMap: ParticipantMap = {}
  const list: ParticipantRequest[] = participants.map((person, i) => {
    const token = `p${i + 1}`
    participantMap[token] = person.id
    return { token, ...effectiveFood(person, outingFoodOf(foodByPerson, person.id)) }
  })

  const request: SearchRequest = {
    requestId,
    participants: list,
    sharedFilters: {
      budgetRanges: settings.budgetRanges.length > 0 ? [...settings.budgetRanges] : 'indifferent',
      kosher: settings.kosher,
      atmospheres: settings.atmospheres.length > 0 ? [...settings.atmospheres] : 'indifferent',
    },
    visitAt: visitAtOf(settings.visit),
    searchMode: settings.searchMode,
    excludedRestaurantIds: [],
  }

  if (settings.searchMode === 'travel_time') {
    request.origin =
      settings.originSource === 'current_location' && settings.currentLocation
        ? { kind: 'current_location', lat: settings.currentLocation.lat, lng: settings.currentLocation.lng }
        : { kind: 'manual_address', text: settings.manualAddress.trim().slice(0, ADDRESS_MAX) }
    request.maxTravelMinutes = settings.maxTravelMinutes
  } else {
    request.areaIds = [...settings.areaIds]
  }

  return { request, participantMap }
}
