// Deterministic ranking (PRD matching rule 4, ARCHITECTURE 2.7).
// Order: fewer known mismatches -> fewer unknowns -> smaller gaps ->
// web reputation -> id. A high rating never jumps over the match order.
import type { Evaluation } from './matchEvaluator'

/** Bayesian adjusted rating: pulls ratings with few reviews toward the pool mean. */
export function adjustedRating(value: number, reviewCount: number, poolMean: number, priorWeight: number): number {
  return (value * reviewCount + poolMean * priorWeight) / (reviewCount + priorWeight)
}

export function rank(evaluations: Evaluation[], limit: number, priorWeight: number): Evaluation[] {
  const rated = evaluations.map((e) => e.candidate.primaryRating).filter((r) => r !== null)
  const poolMean = rated.length > 0 ? rated.reduce((s, r) => s + r.value, 0) / rated.length : 0

  const score = (e: Evaluation) => {
    const r = e.candidate.primaryRating
    return r ? adjustedRating(r.value, r.reviewCount, poolMean, priorWeight) : null
  }

  return [...evaluations]
    .map((e) => ({ e, s: score(e) }))
    .sort((a, b) => {
      if (a.e.mismatchCount !== b.e.mismatchCount) return a.e.mismatchCount - b.e.mismatchCount
      if (a.e.unknownCount !== b.e.unknownCount) return a.e.unknownCount - b.e.unknownCount
      if (a.e.severity !== b.e.severity) return a.e.severity - b.e.severity
      // Missing rating = missing information, ranked after rated ones (not as zero).
      if (a.s === null || b.s === null) {
        if (a.s !== b.s) return a.s === null ? 1 : -1
      } else if (a.s !== b.s) {
        return b.s - a.s
      }
      return a.e.candidate.restaurantId.localeCompare(b.e.candidate.restaurantId)
    })
    .slice(0, limit)
    .map((x) => x.e)
}
