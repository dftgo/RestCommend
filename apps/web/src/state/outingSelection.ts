export const MAX_PARTICIPANTS = 10

export interface ToggleResult {
  selected: string[]
  limitReached: boolean
}

/** Toggle a participant. Selecting beyond the limit leaves the selection unchanged. */
export function toggleParticipant(selected: string[], id: string): ToggleResult {
  if (selected.includes(id)) return { selected: selected.filter((x) => x !== id), limitReached: false }
  if (selected.length >= MAX_PARTICIPANTS) return { selected, limitReached: true }
  return { selected: [...selected, id], limitReached: false }
}

/** Drop ids of profiles that no longer exist (e.g. after deletion). */
export function pruneSelection(selected: string[], existingIds: Iterable<string>): string[] {
  const existing = new Set(existingIds)
  const next = selected.filter((id) => existing.has(id))
  return next.length === selected.length ? selected : next
}

/** Selected ids in the order the profiles appear on screen 01. */
export function orderSelection(selected: string[], orderedIds: string[]): string[] {
  const set = new Set(selected)
  return orderedIds.filter((id) => set.has(id))
}
