// Builds the search request sent to the server. The request types and schema
// live in packages/contracts; the token -> person map never leaves the device.
import {
  isAreaId,
  isFoodTypeId,
  LIMITS,
  type Origin,
  type ParticipantRequest,
  type SearchRequest,
} from '@restcommend/contracts'
import { effectiveFood, outingFoodOf, type OutingFood } from './outingFood'
import type { OutingSettings } from './outingSettings'
import type { Person } from './person'
import { visitAtOf } from './visitTime'

export type { Origin, ParticipantRequest, SearchRequest }

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
    const food = effectiveFood(person, outingFoodOf(foodByPerson, person.id))
    return { token, ...food, foodTypes: food.foodTypes.filter(isFoodTypeId) }
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
        : { kind: 'manual_address', text: settings.manualAddress.trim().slice(0, LIMITS.address) }
    request.maxTravelMinutes = settings.maxTravelMinutes
  } else {
    request.areaIds = settings.areaIds.filter(isAreaId)
  }

  return { request, participantMap }
}
