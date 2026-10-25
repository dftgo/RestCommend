// Text helpers for screen 05 (wording from DESIGN 1.6).
import {
  buildPublicShareText,
  toPublicShareItem,
  type ParamId,
  type Restaurant,
  type RestaurantLink,
} from '@restcommend/contracts'
import { allRestaurants, type SearchSession } from '../state/searchSession'

export const PARAM_LABELS: Record<ParamId, string> = {
  budget: 'תקציב',
  kosher: 'כשרות',
  atmosphere: 'אווירה',
  area: 'אזור',
  travel_time: 'זמן נסיעה',
  food: 'אוכל',
  diet: 'תזונה',
  opening_hours: 'שעות פתיחה',
}

export function matchSummaryText({ mismatchCount, unknownCount }: Restaurant['matchSummary']): string {
  if (mismatchCount > 0) return mismatchCount === 1 ? 'חריגה אחת מההעדפות' : `${mismatchCount} חריגות מההעדפות`
  if (unknownCount > 0) return `ללא חריגות ידועות · ${unknownCount === 1 ? 'פרט אחד לא אומת' : `${unknownCount} פרטים לא אומתו`}`
  return 'ללא חריגות מההעדפות שנבחרו'
}

export function linkLabel(link: RestaurantLink | null): string {
  if (!link) return 'לא נמצא קישור למסעדה'
  return link.kind === 'official_site' ? 'לאתר המסעדה' : 'לפרטים על המסעדה'
}

export function countLine(n: number): string {
  return `${n === 1 ? 'מסעדה אחת' : `${n} מסעדות`} · לפי התאמה לקבוצה, ואז דירוגים ברשת`
}

export function fewerMessage(n: number): string {
  return n === 1 ? 'נמצאה מסעדה אחת על בסיס המידע הזמין' : `נמצאו ${n} מסעדות על בסיס המידע הזמין`
}

export const NONE_FOUND = 'לא נמצאו מסעדות שניתן להמליץ עליהן על בסיס המידע הזמין'
export const NO_MORE = 'לא נמצאו מסעדות נוספות לפי ההגדרות האלה'

/** First rank number of each batch (numbering continues across batches). */
export function batchStartRanks(batchSizes: number[]): number[] {
  let next = 1
  return batchSizes.map((size) => {
    const start = next
    next += size
    return start
  })
}

/** Name for a token, from the device-only map. */
export function participantName(
  token: string,
  participantMap: Record<string, string>,
  namesById: Map<string, string>,
): string {
  const id = participantMap[token]
  return (id && namesById.get(id)) || 'משתתף'
}

/** One share text for every restaurant shown now (allow-listed fields only). */
export function sessionShareText(s: SearchSession): string {
  return buildPublicShareText(s.baseRequest.visitAt, allRestaurants(s).map(toPublicShareItem), s.dataSource)
}
