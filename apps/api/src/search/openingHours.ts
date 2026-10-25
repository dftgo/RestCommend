import type { WeeklyHours } from './researchProvider'

export type OpenState = 'open' | 'closed' | 'unknown'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Weekday (0 = Sunday) of an Israel local date "YYYY-MM-DD". */
function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Is the restaurant open at the visit (Israel local "YYYY-MM-DDTHH:mm")?
 * Intervals whose close is not after open run past midnight.
 */
export function openStateAt(hours: WeeklyHours | null, visitLocal: string): OpenState {
  if (!hours) return 'unknown'
  const [date, time] = visitLocal.split('T')
  const day = weekdayOf(date)
  const t = toMinutes(time)
  const today = hours[String(day) as keyof WeeklyHours] ?? []
  const yesterday = hours[String((day + 6) % 7) as keyof WeeklyHours] ?? []

  for (const { open, close } of today) {
    const o = toMinutes(open)
    const c = toMinutes(close)
    if (c > o ? t >= o && t < c : t >= o) return 'open'
  }
  for (const { open, close } of yesterday) {
    const o = toMinutes(open)
    const c = toMinutes(close)
    if (c <= o && t < c) return 'open'
  }
  return 'closed'
}
