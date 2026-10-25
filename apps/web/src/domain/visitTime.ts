// Visit date/time is always interpreted in Israel time, regardless of the phone's time zone.

export const VISIT_TIME_ZONE = 'Asia/Jerusalem'

export interface LocalDateTime {
  /** YYYY-MM-DD */
  date: string
  /** HH:mm (24h) */
  time: string
}

export interface VisitAt {
  /** Israel local date-time, e.g. 2026-10-29T20:00 */
  local: string
  timeZone: typeof VISIT_TIME_ZONE
  /** ISO UTC instant */
  utc: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VISIT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function israelFields(ms: number) {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(ms)).map((p) => [p.type, p.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** Israel offset from UTC (in ms) at a given instant. */
function israelOffset(ms: number): number {
  const f = israelFields(ms)
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second)
  return asUtc - Math.floor(ms / 1000) * 1000
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Current (or given) instant as an Israel local date and time. */
export function israelLocal(now: Date): LocalDateTime {
  const f = israelFields(now.getTime())
  return { date: `${f.year}-${pad(f.month)}-${pad(f.day)}`, time: `${pad(f.hour)}:${pad(f.minute)}` }
}

export function isWellFormed(v: LocalDateTime): boolean {
  return DATE_RE.test(v.date) && TIME_RE.test(v.time)
}

/** Convert an Israel local date and time to a UTC instant (handles summer/winter time). */
export function israelLocalToUtc(v: LocalDateTime): Date {
  const [y, m, d] = v.date.split('-').map(Number)
  const [h, mi] = v.time.split(':').map(Number)
  const naive = Date.UTC(y, m - 1, d, h, mi)
  const guess = naive - israelOffset(naive)
  return new Date(naive - israelOffset(guess))
}

/** True when the visit is not in the future (or the value is incomplete). */
export function isPastVisit(v: LocalDateTime, now: Date): boolean {
  if (!isWellFormed(v)) return true
  return israelLocalToUtc(v).getTime() <= now.getTime()
}

/** Default visit: today, at the next round hour (e.g. 18:20 -> 19:00). */
export function defaultVisit(now: Date): LocalDateTime {
  const inAnHour = israelLocal(new Date(now.getTime() + 60 * 60 * 1000))
  return { date: inAnHour.date, time: `${inAnHour.time.slice(0, 2)}:00` }
}

export function visitAtOf(v: LocalDateTime): VisitAt {
  return { local: `${v.date}T${v.time}`, timeZone: VISIT_TIME_ZONE, utc: israelLocalToUtc(v).toISOString() }
}
