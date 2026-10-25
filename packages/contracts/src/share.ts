// Public share text. Built ONLY from an allow-list of fields, so names,
// tokens, personal reasons and the origin address can never leak into it.
import type { VisitAt } from './request'
import type { DataSource, Restaurant } from './response'

export interface PublicShareItem {
  name: string
  city: string
  groupReason: string
  linkUrl?: string
}

export const DEMO_SHARE_NOTE = 'נתוני דוגמה — לא מסעדות אמיתיות'

/** The allow-list: the only restaurant fields that may be shared. */
export function toPublicShareItem(r: Restaurant): PublicShareItem {
  const item: PublicShareItem = { name: r.name, city: r.city, groupReason: r.groupReason }
  if (r.link) item.linkUrl = r.link.url
  return item
}

/** "2026-10-29T20:00" -> "29.10.2026, 20:00" */
export function formatVisitLocal(local: string): string {
  const [date, time] = local.split('T')
  const [y, m, d] = date.split('-')
  return `${d}.${m}.${y}, ${time}`
}

export function buildPublicShareText(
  visitAt: Pick<VisitAt, 'local'>,
  items: PublicShareItem[],
  dataSource: DataSource,
): string {
  const lines = [`המלצות למסעדה ליציאה ב־${formatVisitLocal(visitAt.local)}`]
  if (dataSource === 'demo') lines.push(`(${DEMO_SHARE_NOTE})`)
  items.forEach((item, i) => {
    lines.push('', `${i + 1}. ${item.name} — ${item.city}`, item.groupReason)
    if (item.linkUrl) lines.push(item.linkUrl)
  })
  return lines.join('\n')
}
