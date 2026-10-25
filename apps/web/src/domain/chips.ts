/**
 * Multi-select toggle that keeps catalog order. An empty list means
 * "doesn't matter". When `max` is reached, adding another id is ignored.
 */
export function toggleInOrder<T extends string>(current: T[], id: T, order: readonly T[], max?: number): T[] {
  if (current.includes(id)) return current.filter((x) => x !== id)
  if (max !== undefined && current.length >= max) return current
  const next = [...current, id]
  return order.filter((x) => next.includes(x))
}
