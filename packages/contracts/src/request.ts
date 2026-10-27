// Search request: POST /v1/recommendations. Strict objects: unknown fields
// (for example a participant name) are rejected.
import { z } from 'zod'
import {
  AREA_IDS,
  ATMOSPHERE_IDS,
  BUDGET_RANGE_IDS,
  DIET_IDS,
  FOOD_MODE_IDS,
  FOOD_TYPE_IDS,
  KOSHER_IDS,
  LIMITS,
  MAX_ATMOSPHERES,
  SEARCH_MODE_IDS,
} from './catalogs'

const freeText = z.string().max(LIMITS.freeText)

const unique = (list: readonly string[]) => new Set(list).size === list.length

export const ParticipantRequestSchema = z.strictObject({
  /** Temporary token (p1, p2, ...). Never a name or a profile id. */
  token: z.string().regex(/^p([1-9]|10)$/),
  foodMode: z.enum(FOOD_MODE_IDS),
  /** Effective food types after precedence. Empty = no food type preference. */
  foodTypes: z.array(z.enum(FOOD_TYPE_IDS)).max(FOOD_TYPE_IDS.length).refine(unique),
  /** Outing text ("בחירה לערב" only). */
  outingText: freeText.optional(),
  /** Profile free text; always sent when present, low priority. */
  profileText: freeText.optional(),
  /** Always sent. */
  diet: z.enum(DIET_IDS),
})

export const OriginSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('current_location'),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  z.strictObject({
    kind: z.literal('manual_address'),
    text: z.string().trim().min(1).max(LIMITS.address),
  }),
])

export const VisitAtSchema = z.strictObject({
  /** Israel local date-time, e.g. 2026-10-29T20:00 */
  local: z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/),
  timeZone: z.literal('Asia/Jerusalem'),
  /** ISO UTC instant */
  utc: z.iso.datetime(),
})

export const SharedFiltersSchema = z.strictObject({
  budgetRanges: z.union([
    z.literal('indifferent'),
    z.array(z.enum(BUDGET_RANGE_IDS)).min(1).max(BUDGET_RANGE_IDS.length).refine(unique),
  ]),
  kosher: z.enum(KOSHER_IDS),
  atmospheres: z.union([
    z.literal('indifferent'),
    z.array(z.enum(ATMOSPHERE_IDS)).min(1).max(MAX_ATMOSPHERES).refine(unique),
  ]),
})

export const TravelMinutesSchema = z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)])

export const SearchRequestSchema = z
  .strictObject({
    requestId: z.string().min(1).max(100),
    participants: z.array(ParticipantRequestSchema).min(LIMITS.minParticipants).max(LIMITS.maxParticipants),
    sharedFilters: SharedFiltersSchema,
    visitAt: VisitAtSchema,
    searchMode: z.enum(SEARCH_MODE_IDS),
    /** travel_time only */
    origin: OriginSchema.optional(),
    /** travel_time only */
    maxTravelMinutes: TravelMinutesSchema.optional(),
    /** areas only */
    areaIds: z.array(z.enum(AREA_IDS)).min(1).max(AREA_IDS.length).refine(unique).optional(),
    excludedRestaurantIds: z.array(z.string().min(1).max(100)).max(LIMITS.maxExcluded),
    /** "Name — city" of every shown restaurant, so the search can skip them. Not personal data. */
    excludedRestaurantNames: z.array(z.string().trim().min(1).max(300)).max(LIMITS.maxExcluded).optional(),
  })
  .superRefine((r, ctx) => {
    if (!unique(r.participants.map((p) => p.token))) {
      ctx.addIssue({ code: 'custom', message: 'duplicate token', path: ['participants'] })
    }
    if (r.searchMode === 'travel_time') {
      if (!r.origin) ctx.addIssue({ code: 'custom', message: 'origin required', path: ['origin'] })
      if (r.maxTravelMinutes === undefined) {
        ctx.addIssue({ code: 'custom', message: 'maxTravelMinutes required', path: ['maxTravelMinutes'] })
      }
      if (r.areaIds !== undefined) ctx.addIssue({ code: 'custom', message: 'areaIds not allowed', path: ['areaIds'] })
    } else {
      if (!r.areaIds) ctx.addIssue({ code: 'custom', message: 'areaIds required', path: ['areaIds'] })
      if (r.origin !== undefined) ctx.addIssue({ code: 'custom', message: 'origin not allowed', path: ['origin'] })
      if (r.maxTravelMinutes !== undefined) {
        ctx.addIssue({ code: 'custom', message: 'maxTravelMinutes not allowed', path: ['maxTravelMinutes'] })
      }
    }
  })

export type ParticipantRequest = z.infer<typeof ParticipantRequestSchema>
export type Origin = z.infer<typeof OriginSchema>
export type VisitAt = z.infer<typeof VisitAtSchema>
export type SearchRequest = z.infer<typeof SearchRequestSchema>
