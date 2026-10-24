import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { pruneSelection, toggleParticipant } from './outingSelection'

// The current outing lives in memory only (not persisted), per the architecture.
interface OutingState {
  selectedIds: string[]
  /** Returns false when the participant limit blocked the selection. */
  toggle: (id: string) => boolean
  remove: (id: string) => void
  prune: (existingIds: string[]) => void
}

const OutingContext = createContext<OutingState | null>(null)

export function OutingProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const ref = useRef(selectedIds)

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

  const remove = useCallback((id: string) => set(ref.current.filter((x) => x !== id)), [set])

  const prune = useCallback(
    (existingIds: string[]) => {
      const next = pruneSelection(ref.current, existingIds)
      if (next !== ref.current) set(next)
    },
    [set],
  )

  const value = useMemo(() => ({ selectedIds, toggle, remove, prune }), [selectedIds, toggle, remove, prune])
  return <OutingContext.Provider value={value}>{children}</OutingContext.Provider>
}

export function useOuting(): OutingState {
  const ctx = useContext(OutingContext)
  if (!ctx) throw new Error('useOuting must be used inside OutingProvider')
  return ctx
}
