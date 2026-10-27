// Turns the model's JSON into Candidates. The rule: a fact survives only if
// at least one of its cited pages was really returned by the web search.
// Otherwise it becomes null / "unknown" — never a guess. A candidate with no
// verified source at all, or without name / city / address, is dropped.
// The model cites pages by number (its `sources` list); numbers are turned
// back into URLs here and then checked against the search results.
import { isHttpsUrl, type Rating, type SearchRequest } from '@restcommend/contracts'
import { cleanText } from './sanitize'
import { hostOf, restaurantIdOf, type SourceRegistry } from './sources'
import type { ModelCandidate, ModelSource } from './outputSchema'
import { weekdayOfLocal } from './prompt'
import type { Candidate, FactKey, WeeklyHours } from '../researchProvider'

export const TRAVEL_NOTE_UNVERIFIED = 'לא ניתן לאמת זמן נסיעה'
const MAX_PRICE = 3000
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** "9:30" -> "09:30"; anything else invalid -> null. */
function hhmm(value: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const t = `${m[1].padStart(2, '0')}:${m[2]}`
  return HHMM.test(t) ? t : null
}

type Day = ModelCandidate['hoursVisitDay']

function intervals(day: Day): { open: string; close: string }[] | null {
  if (day === null) return null
  const out = []
  for (const i of day) {
    const open = hhmm(i.open)
    const close = hhmm(i.close)
    if (!open || !close) return null // unreadable = unknown
    out.push({ open, close })
  }
  return out
}

/** Hours for the visit day and the day before (all the closed-check needs); unknown if either is unknown. */
function hours(m: ModelCandidate, visitLocal: string): WeeklyHours | null {
  const visit = intervals(m.hoursVisitDay)
  const before = intervals(m.hoursDayBefore)
  if (visit === null || before === null) return null
  const day = weekdayOfLocal(visitLocal.split('T')[0])
  return { [String(day)]: visit, [String((day + 6) % 7)]: before } as WeeklyHours
}

function price(p: ModelCandidate['price']): Candidate['priceEstimate'] {
  if (!p) return null
  const min = Math.round(p.min)
  const max = Math.round(p.max)
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max <= 0 || min > max || max > MAX_PRICE) return null
  return { min, max }
}

function shortList(items: string[], maxItems: number, maxLen: number): string[] {
  const out: string[] = []
  for (const item of items) {
    const t = cleanText(item, maxLen)
    if (t && !out.includes(t)) out.push(t)
    if (out.length >= maxItems) break
  }
  return out
}

export interface MapResult {
  candidates: Candidate[]
  /** How many the model returned, before checks. */
  returned: number
}

export function mapCandidates(
  models: ModelCandidate[],
  modelSources: ModelSource[],
  request: SearchRequest,
  registry: SourceRegistry,
  maxCandidates: number,
): MapResult {
  const urlOf = new Map<number, string>()
  for (const s of modelSources) if (!urlOf.has(s.n)) urlOf.set(s.n, s.url)
  /** Cited numbers -> URLs (unknown numbers dropped). */
  const urls = (refs: number[]) => refs.map((n) => urlOf.get(n)).filter((u) => u !== undefined)

  const tokens = new Set(request.participants.map((p) => p.token))
  const withText = new Set(request.participants.filter((p) => p.outingText).map((p) => p.token))
  const seen = new Set<string>()
  const candidates: Candidate[] = []

  for (const m of models) {
    const name = cleanText(m.name, 120)
    const city = cleanText(m.city, 80)
    const address = cleanText(m.address, 200)
    if (!name || !city || !address) continue
    const restaurantId = restaurantIdOf(name, city)
    if (seen.has(restaurantId)) continue

    const factSources: Partial<Record<FactKey, string[]>> = {}
    const fact = (key: FactKey, refs: number[]) => {
      const ids = registry.ids(urls(refs))
      if (ids.length > 0) factSources[key] = ids
      return ids.length > 0
    }

    const hasCuisine = fact('cuisine', m.cuisineRefs)
    const menuIds = registry.ids(urls(m.menuRefs))
    const hasPrice = fact('price', m.priceRefs)
    const hasKosher = fact('kosher', m.kosherRefs)
    const hasAtmosphere = fact('atmosphere', m.atmosphereRefs)
    const hasDiet = fact('diet', m.dietRefs)
    const hasHours = fact('hours', m.hoursRefs)

    const ratings: Rating[] = []
    const ratingIds: string[] = []
    for (const r of m.ratings) {
      const url = urlOf.get(r.ref)
      const verified = url ? registry.verify(url) : null
      if (!url || !verified) continue
      if (!(r.scale > 0 && r.scale <= 100 && r.value >= 0 && r.value <= r.scale)) continue
      const rating: Rating = {
        sourceName: cleanText(r.sourceName, 100) ?? hostOf(verified.url) ?? 'מקור',
        value: Math.round(r.value * 100) / 100,
        scale: r.scale,
        url: verified.url,
      }
      if (r.reviewCount !== null && Number.isFinite(r.reviewCount) && r.reviewCount >= 0) {
        rating.reviewCount = Math.round(r.reviewCount)
      }
      ratings.push(rating)
      ratingIds.push(...registry.ids([url]))
    }

    const textMatches: NonNullable<Candidate['textMatches']> = {}
    const textIds: string[] = []
    for (const t of m.textMatches) {
      if (!withText.has(t.token)) continue
      const ids = registry.ids(urls(t.refs))
      const dishes = shortList(t.dishes, 5, 60)
      if (ids.length === 0 || dishes.length === 0) continue
      textMatches[t.token as keyof typeof textMatches] = dishes
      textIds.push(...ids)
    }

    // Link: official site only if the search really found that site's domain.
    let link: Candidate['link'] = null
    const website = m.websiteRef !== null ? urlOf.get(m.websiteRef)?.trim() : undefined
    const websiteHost = website && isHttpsUrl(website) ? hostOf(website) : null
    if (website && websiteHost && registry.hasHost(websiteHost)) {
      link = { url: website, kind: 'official_site' }
    }

    const sourceIds = [...new Set([...Object.values(factSources).flat(), ...menuIds, ...ratingIds, ...textIds])]
    if (sourceIds.length === 0) continue // nothing verified: not shown at all

    if (!link) {
      // Alternative: a found page that describes this restaurant.
      const preferred = ratingIds[0] ?? menuIds[0] ?? sourceIds[0]
      const first = registry.used().find((s) => s.id === preferred)
      link = first ? { url: first.url, kind: 'alternative' } : null
    }

    const participantNotes: NonNullable<Candidate['participantNotes']> = {}
    for (const n of m.participantNotes) {
      if (!tokens.has(n.token)) continue
      const note = cleanText(n.note, 300)
      if (note) participantNotes[n.token as keyof typeof participantNotes] = note
    }
    const description = cleanText(m.description, 400)

    candidates.push({
      restaurantId,
      name,
      city,
      address,
      areaId: m.areaId,
      cuisines: hasCuisine ? [...new Set(m.cuisines ?? [])] : null,
      menuKeywords: menuIds.length > 0 ? shortList(m.menuHighlights, 8, 60) : [],
      priceEstimate: hasPrice ? price(m.price) : null,
      kosher: hasKosher ? m.kosher : 'unknown',
      atmospheres: hasAtmosphere && m.atmospheres ? [...new Set(m.atmospheres)] : null,
      vegetarianOptions: hasDiet ? m.vegetarianOptions : 'unknown',
      veganOptions: hasDiet ? m.veganOptions : 'unknown',
      openingHours: hasHours ? hours(m, request.visitAt.local) : null,
      ratings,
      primaryRating: null, // set for the whole pool below
      travelMinutes: null, // Milestone 5 (Routes); the model never estimates it
      travelNote: TRAVEL_NOTE_UNVERIFIED,
      link,
      sourceIds,
      factSources,
      ...(Object.keys(textMatches).length > 0 ? { textMatches } : {}),
      ...(description ? { description } : {}),
      ...(Object.keys(participantNotes).length > 0 ? { participantNotes } : {}),
    })
    seen.add(restaurantId)
    if (candidates.length >= maxCandidates) break
  }

  return { candidates, returned: models.length }
}

/**
 * Tie-break rating: one consistent source for the whole pool — the rating site
 * that covers the most candidates — scaled to 0–5. Candidates without a rating
 * from that site get null (missing information, not zero).
 */
export function setPrimaryRatings(candidates: Candidate[]): void {
  const coverage = new Map<string, number>()
  for (const c of candidates) {
    const hosts = new Set(c.ratings.map((r) => (r.url ? hostOf(r.url) : null)).filter((h) => h !== null))
    for (const h of hosts) coverage.set(h, (coverage.get(h) ?? 0) + 1)
  }
  let best: string | null = null
  for (const [host, count] of coverage) {
    if (count >= 2 && (best === null || count > coverage.get(best)!)) best = host
  }
  for (const c of candidates) {
    const r = best ? c.ratings.find((x) => x.url && hostOf(x.url) === best) : undefined
    c.primaryRating = r
      ? { value: Math.min(5, Math.round((r.value / r.scale) * 5 * 100) / 100), reviewCount: r.reviewCount ?? 0 }
      : null
  }
}
