import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { pruneSelection, toggleParticipant } from './outingSelection'
import { DEFAULT_OUTING_FOOD, pruneFoodMap, type OutingFood } from '../domain/outingFood'
import { defaultSettings, type OutingSettings } from '../domain/outingSettings'
import type { BuiltRequest } from '../domain/searchRequest'

// The current outing lives in memory only (not persisted), per the architecture.
interface OutingState {
  selectedIds: string[]
  /** Returns false when the participant limit blocked the selection. */
  toggle: (id: string) => boolean
  remove: (id: string) => void
  prune: (existingIds: string[]) => void

  /** Screen 03 input, keyed by person id. */
  foodByPerson: Record<string, OutingFood>
  updateFood: (personId: string, patch: Partial<OutingFood>) => void

  /** Screen 04 input. */
  settings: OutingSettings
  updateSettings: (patch: Partial<OutingSettings>) => void

  /** Last built search request (and its device-only participant map). */
  lastRequest: BuiltRequest | null
  setLastRequest: (r: BuiltRequest | null) => void
}

const OutingContext = createContext<OutingState | null>(null)

export function OutingProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const ref = useRef(selectedIds)
  const [foodByPerson, setFoodByPerson] = useState<Record<string, OutingFood>>({})
  const [settings, setSettings] = useState<OutingSettings>(() => defaultSettings(new Date()))
  const [lastRequest, setLastRequest] = useState<BuiltRequest | null>(null)

  const set = useCallback((next: string[]) => {
    ref.current = next
    setSelectedIds(next)
  }, [])

  const toggle = useCallback(
    (id: string) => {
      const result = toggleParticipant(ref.current, id)
      if (!result.limitReached) set(result.selected)
      return !result.limitReached
    },
    [set],
  )

  const remove = useCallback(
    (id: string) => {
      set(ref.current.filter((x) => x !== id))
      setFoodByPerson((m) => pruneFoodMap(m, Object.keys(m).filter((k) => k !== id)))
    },
    [set],
  )

  const prune = useCallback(
    (existingIds: string[]) => {
      const next = pruneSelection(ref.current, existingIds)
      if (next !== ref.current) set(next)
      setFoodByPerson((m) => pruneFoodMap(m, existingIds))
    },
    [set],
  )

  const updateFood = useCallback((personId: string, patch: Partial<OutingFood>) => {
    setFoodByPerson((m) => ({ ...m, [personId]: { ...(m[personId] ?? DEFAULT_OUTING_FOOD), ...patch } }))
  }, [])

  const updateSettings = useCallback((patch: Partial<OutingSettings>) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  const value = useMemo(
    () => ({
      selectedIds,
      toggle,
      remove,
      prune,
      foodByPerson,
      updateFood,
      settings,
      updateSettings,
      lastRequest,
      setLastRequest,
    }),
    [selectedIds, toggle, remove, prune, foodByPerson, updateFood, settings, updateSettings, lastRequest],
  )
  return <OutingContext.Provider value={value}>{children}</OutingContext.Provider>
}

export function useOuting(): OutingState {
  const ctx = useContext(OutingContext)
  if (!ctx) throw new Error('useOuting must be used inside OutingProvider')
  return ctx
}
