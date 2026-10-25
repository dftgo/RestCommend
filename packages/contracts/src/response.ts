// Recommendations response and error body.
import { z } from 'zod'
import { LIMITS } from './catalogs'

/** Only https links may reach the screen (blocks javascript: and similar). */
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

const httpsUrl = z.string().max(2000).refine(isHttpsUrl, 'https url required')
const shortText = z.string().min(1).max(300)
const longText = z.string().min(1).max(1000)

export const PARAM_IDS = [
  'budget',
  'kosher',
  'atmosphere',
  'area',
  'travel_time',
  'food',
  'diet',
  'opening_hours',
] as const
export type ParamId = (typeof PARAM_IDS)[number]

export const PARAM_STATUSES = ['match', 'unknown', 'mismatch'] as const
export type ParamStatus = (typeof PARAM_STATUSES)[number]

export const ParameterResultSchema = z.strictObject({
  param: z.enum(PARAM_IDS),
  /** Participant token, for food and diet only. */
  token: z.string().regex(/^p([1-9]|10)$/).optional(),
  status: z.enum(PARAM_STATUSES),
  /** Hebrew, no participant names. */
  reason: shortText,
  sourceIds: z.array(z.string()),
})

export const RatingSchema = z.strictObject({
  sourceName: shortText,
  value: z.number().min(0),
  scale: z.number().positive(),
  reviewCount: z.number().int().min(0).optional(),
  url: httpsUrl.optional(),
})

export const LinkSchema = z.strictObject({
  url: httpsUrl,
  kind: z.enum(['official_site', 'alternative']),
})

export const RestaurantSchema = z.strictObject({
  restaurantId: z.string().min(1).max(100),
  /** Includes the branch when relevant. */
  name: shortText,
  city: shortText,
  address: shortText,
  link: LinkSchema.nullable(),
  priceEstimate: z
    .strictObject({
      min: z.number().min(0),
      max: z.number().min(0),
      currency: z.literal('ILS'),
      sourceIds: z.array(z.string()),
    })
    .refine((p) => p.min <= p.max)
    .nullable(),
  /** travel_time mode only; null = could not be verified. */
  travelEstimate: z.strictObject({ minutes: z.number().int().min(0), note: shortText }).nullable().optional(),
  matchSummary: z.strictObject({
    mismatchCount: z.number().int().min(0),
    unknownCount: z.number().int().min(0),
  }),
  parameters: z.array(ParameterResultSchema),
  deviations: z.array(ParameterResultSchema),
  uncertainties: z.array(ParameterResultSchema),
  perParticipantReasons: z.array(z.strictObject({ token: z.string().regex(/^p([1-9]|10)$/), text: longText })),
  groupReason: longText,
  ratingsBySource: z.array(RatingSchema),
  sourceIds: z.array(z.string()),
})

export const SourceSchema = z.strictObject({
  id: z.string().min(1).max(100),
  title: shortText,
  url: httpsUrl,
  retrievedAt: z.iso.datetime().optional(),
})

export const FEWER_RESULTS_REASONS = ['fewer_than_five', 'none_found', 'no_more'] as const

export const RecommendationsResponseSchema = z.strictObject({
  requestId: z.string().min(1).max(100),
  dataSource: z.enum(['demo', 'live']),
  searchedAt: z.iso.datetime(),
  restaurants: z.array(RestaurantSchema).max(LIMITS.maxResults),
  fewerResultsReason: z.enum(FEWER_RESULTS_REASONS).nullable(),
  publicShareText: z.string().max(20000),
  sources: z.array(SourceSchema),
})

export type ParameterResult = z.infer<typeof ParameterResultSchema>
export type Rating = z.infer<typeof RatingSchema>
export type RestaurantLink = z.infer<typeof LinkSchema>
export type Restaurant = z.infer<typeof RestaurantSchema>
export type Source = z.infer<typeof SourceSchema>
export type FewerResultsReason = (typeof FEWER_RESULTS_REASONS)[number]
export type DataSource = 'demo' | 'live'
export type RecommendationsResponse = z.infer<typeof RecommendationsResponseSchema>

// ---------- Errors ----------

export const ERROR_CODES = [
  'UNAUTHORIZED',
  'VALIDATION_ERROR',
  'LOCATION_UNRESOLVED',
  'PROVIDER_UNAVAILABLE',
  'SEARCH_TIMEOUT',
  'RATE_LIMITED',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 400,
  LOCATION_UNRESOLVED: 422,
  PROVIDER_UNAVAILABLE: 503,
  SEARCH_TIMEOUT: 504,
  RATE_LIMITED: 429,
}

export const ErrorBodySchema = z.object({ error: z.object({ code: z.enum(ERROR_CODES) }) })
export type ErrorBody = z.infer<typeof ErrorBodySchema>

/** Header that carries the shared access key. */
export const ACCESS_KEY_HEADER = 'X-App-Key'
