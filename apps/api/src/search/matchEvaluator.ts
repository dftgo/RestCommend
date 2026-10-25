// Decides match / unknown / mismatch for every ACTIVE parameter
// (ARCHITECTURE 2.3, 2.7). "Doesn't matter" parameters are not active and
// never counted. Deterministic: the model never decides these statuses.
import {
  areaLabel,
  atmosphereLabel,
  BUDGET_BOUNDS,
  foodTypeLabel,
  type BudgetRange,
  type ParameterResult,
  type ParticipantRequest,
  type SearchRequest,
} from '@restcommend/contracts'
import type { Candidate } from './researchProvider'
import type { OpenState } from './openingHours'

export interface Evaluation {
  candidate: Candidate
  parameters: ParameterResult[]
  mismatchCount: number
  unknownCount: number
  /** Total gap size; smaller gaps rank first among equal counts. */
  severity: number
}

type Result = ParameterResult & { severity?: number }

const list = (labels: (string | undefined)[]) => labels.filter(Boolean).join(', ')

function priceText(p: { min: number; max: number }) {
  return `${p.min}–${p.max} ₪`
}

export function priceMidpoint(p: { min: number; max: number }) {
  return (p.min + p.max) / 2
}

export function inBudget(x: number, range: BudgetRange): boolean {
  const { low, high } = BUDGET_BOUNDS[range]
  return x > low && x <= high
}

/** Distance in ILS from x to the nearest edge of the range (0 when inside). */
export function budgetDistance(x: number, range: BudgetRange): number {
  const { low, high } = BUDGET_BOUNDS[range]
  if (x <= Math.max(low, 0)) return Math.max(low, 0) - x
  if (x > high) return x - high
  return 0
}

function budget(c: Candidate, ranges: BudgetRange[]): Result {
  const sourceIds = c.sourceIds
  if (!c.priceEstimate) {
    return { param: 'budget', status: 'unknown', reason: 'לא נמצא מידע מאומת על המחיר', sourceIds: [] }
  }
  const mid = priceMidpoint(c.priceEstimate)
  if (ranges.some((r) => inBudget(mid, r))) {
    return {
      param: 'budget',
      status: 'match',
      reason: `מחיר משוער לאדם ${priceText(c.priceEstimate)}, בתוך התקציב שנבחר`,
      sourceIds,
    }
  }
  const gap = Math.min(...ranges.map((r) => budgetDistance(mid, r)))
  return {
    param: 'budget',
    status: 'mismatch',
    reason: `מחיר משוער לאדם ${priceText(c.priceEstimate)}, מחוץ לתקציב שנבחר`,
    sourceIds,
    severity: gap / 100,
  }
}

function kosher(c: Candidate, wanted: 'certified' | 'at_least_no_pork_seafood'): Result {
  const sourceIds = c.sourceIds
  switch (c.kosher) {
    case 'unknown':
      return { param: 'kosher', status: 'unknown', reason: 'לא נמצא מידע מאומת על כשרות', sourceIds: [] }
    case 'certified':
      return { param: 'kosher', status: 'match', reason: 'כשרה עם תעודה', sourceIds }
    case 'no_pork_seafood':
      return wanted === 'certified'
        ? { param: 'kosher', status: 'mismatch', reason: 'ללא תעודת כשרות', sourceIds }
        : { param: 'kosher', status: 'match', reason: 'ללא חזיר ופירות ים לפי המקורות (אין תעודת כשרות)', sourceIds }
    case 'serves_pork_or_seafood':
      return { param: 'kosher', status: 'mismatch', reason: 'מגישה חזיר או פירות ים', sourceIds }
  }
}

function atmosphere(c: Candidate, wanted: string[]): Result {
  if (!c.atmospheres) {
    return { param: 'atmosphere', status: 'unknown', reason: 'לא נמצא מידע מאומת על האווירה', sourceIds: [] }
  }
  const hit = wanted.filter((a) => c.atmospheres!.includes(a as never))
  if (hit.length > 0) {
    return { param: 'atmosphere', status: 'match', reason: `אווירה ${list(hit.map(atmosphereLabel))}`, sourceIds: c.sourceIds }
  }
  return {
    param: 'atmosphere',
    status: 'mismatch',
    reason: `האווירה המתוארת: ${list(c.atmospheres.map(atmosphereLabel)) || 'אחרת'}`,
    sourceIds: c.sourceIds,
  }
}

function area(c: Candidate, areaIds: string[]): Result {
  if (!c.areaId) return { param: 'area', status: 'unknown', reason: 'לא נמצא מידע מאומת על האזור', sourceIds: [] }
  if (areaIds.includes(c.areaId)) {
    return { param: 'area', status: 'match', reason: `באזור ${areaLabel(c.areaId)}`, sourceIds: c.sourceIds }
  }
  return {
    param: 'area',
    status: 'mismatch',
    reason: `מחוץ לאזורים שנבחרו (${areaLabel(c.areaId)})`,
    sourceIds: c.sourceIds,
  }
}

function travel(c: Candidate, max: number): Result {
  if (c.travelMinutes === null) {
    return { param: 'travel_time', status: 'unknown', reason: 'לא ניתן לאמת זמן נסיעה', sourceIds: [] }
  }
  const m = c.travelMinutes
  if (m <= max) return { param: 'travel_time', status: 'match', reason: `כ־${m} דק׳ נסיעה`, sourceIds: [] }
  return {
    param: 'travel_time',
    status: 'mismatch',
    reason: `כ־${m} דק׳ נסיעה, ${m - max} דק׳ מעבר לזמן שנבחר`,
    sourceIds: [],
    severity: (m - max) / 15,
  }
}

/** Menu word found in the outing text, if any. */
function keywordHit(c: Candidate, text: string | undefined): string | undefined {
  if (!text) return undefined
  const t = text.toLocaleLowerCase()
  return c.menuKeywords.find((k) => t.includes(k.toLocaleLowerCase()))
}

function food(c: Candidate, p: ParticipantRequest): Result | null {
  if (p.foodTypes.length === 0 && !p.outingText) return null // no food preference: not active
  const token = p.token
  const matched = p.foodTypes.filter((f) => c.cuisines?.includes(f))
  if (matched.length > 0) {
    return { param: 'food', token, status: 'match', reason: `יש ${list(matched.map(foodTypeLabel))}`, sourceIds: c.sourceIds }
  }
  const hit = keywordHit(c, p.outingText)
  if (hit) return { param: 'food', token, status: 'match', reason: `בתפריט: ${hit}`, sourceIds: c.sourceIds }
  if (p.foodTypes.length > 0 && c.cuisines !== null) {
    return {
      param: 'food',
      token,
      status: 'mismatch',
      reason: `אין ${list(p.foodTypes.map(foodTypeLabel))} (המטבח: ${list(c.cuisines.map(foodTypeLabel)) || 'אחר'})`,
      sourceIds: c.sourceIds,
    }
  }
  return { param: 'food', token, status: 'unknown', reason: 'לא נמצא מידע מאומת שהתפריט מתאים', sourceIds: [] }
}

function diet(c: Candidate, p: ParticipantRequest): Result | null {
  if (p.diet === 'indifferent') return null
  const token = p.token
  const word = p.diet === 'vegan' ? 'טבעוניות' : 'צמחוניות'
  // Vegan dishes are also vegetarian.
  const state = p.diet === 'vegan' ? c.veganOptions : c.veganOptions === 'yes' ? 'yes' : c.vegetarianOptions
  if (state === 'yes') return { param: 'diet', token, status: 'match', reason: `יש מנות ${word}`, sourceIds: c.sourceIds }
  if (state === 'no') return { param: 'diet', token, status: 'mismatch', reason: `אין מנות ${word}`, sourceIds: c.sourceIds }
  return { param: 'diet', token, status: 'unknown', reason: `לא נמצא מידע מאומת על מנות ${word}`, sourceIds: [] }
}

function openingHours(state: OpenState, c: Candidate): Result {
  return state === 'open'
    ? { param: 'opening_hours', status: 'match', reason: 'פתוחה במועד שנבחר לפי שעות הפתיחה הידועות', sourceIds: c.sourceIds }
    : { param: 'opening_hours', status: 'unknown', reason: 'לא נמצא מידע מאומת על שעות הפתיחה במועד שנבחר', sourceIds: [] }
}

/** Evaluate one candidate that is not known to be closed at the visit time. */
export function evaluate(c: Candidate, request: SearchRequest, openState: Exclude<OpenState, 'closed'>): Evaluation {
  const results: Result[] = []
  const f = request.sharedFilters

  if (f.budgetRanges !== 'indifferent') results.push(budget(c, f.budgetRanges))
  if (f.kosher !== 'indifferent') results.push(kosher(c, f.kosher))
  if (f.atmospheres !== 'indifferent') results.push(atmosphere(c, f.atmospheres))
  if (request.searchMode === 'areas' && request.areaIds) results.push(area(c, request.areaIds))
  if (request.searchMode === 'travel_time' && request.maxTravelMinutes) results.push(travel(c, request.maxTravelMinutes))
  for (const p of request.participants) {
    const a = food(c, p)
    if (a) results.push(a)
    const b = diet(c, p)
    if (b) results.push(b)
  }
  results.push(openingHours(openState, c))

  let severity = 0
  const parameters: ParameterResult[] = results.map(({ severity: s, ...r }) => {
    if (r.status === 'mismatch') severity += s ?? 1
    return r
  })
  return {
    candidate: c,
    parameters,
    mismatchCount: parameters.filter((r) => r.status === 'mismatch').length,
    unknownCount: parameters.filter((r) => r.status === 'unknown').length,
    severity,
  }
}
