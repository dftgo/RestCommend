// What a research provider returns: candidate restaurants with FACTS only.
// Deciding match / unknown / mismatch and the ranking order is NOT the
// provider's job — MatchEvaluator and Ranker do that in code. In Milestone 3
// the provider is the demo fixture provider; in Milestone 4 it is OpenAI.
import { z } from 'zod'
import {
  AREA_IDS,
  ATMOSPHERE_IDS,
  FOOD_TYPE_IDS,
  LinkSchema,
  RatingSchema,
  SourceSchema,
  type SearchRequest,
} from '@restcommend/contracts'

const tri = z.enum(['yes', 'no', 'unknown'])
const token = z.string().regex(/^p([1-9]|10)$/)

/** Facts that can carry their own sources. */
export const FACT_KEYS = ['price', 'kosher', 'atmosphere', 'cuisine', 'diet', 'hours'] as const
export type FactKey = (typeof FACT_KEYS)[number]
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

/** One opening interval. close <= open means it ends after midnight. */
export const IntervalSchema = z.strictObject({ open: hhmm, close: hhmm })

/** Keys "0".."6" = Sunday..Saturday. A missing / empty day = closed that day. */
export const WeeklyHoursSchema = z.partialRecord(z.enum(['0', '1', '2', '3', '4', '5', '6']), z.array(IntervalSchema))

export const CandidateSchema = z.strictObject({
  restaurantId: z.string().min(1).max(100),
  name: z.string().min(1).max(300),
  city: z.string().min(1).max(300),
  address: z.string().min(1).max(300),
  areaId: z.enum(AREA_IDS).nullable(),
  /** null = cuisine unknown */
  cuisines: z.array(z.enum(FOOD_TYPE_IDS)).nullable(),
  /** Dishes / words from the menu, used to check free text. */
  menuKeywords: z.array(z.string().min(1).max(60)),
  /** Price per person in ILS; null = unknown. */
  priceEstimate: z.strictObject({ min: z.number().min(0), max: z.number().min(0) }).nullable(),
  kosher: z.enum(['certified', 'no_pork_seafood', 'serves_pork_or_seafood', 'unknown']),
  /** null = atmosphere unknown */
  atmospheres: z.array(z.enum(ATMOSPHERE_IDS)).nullable(),
  vegetarianOptions: tri,
  veganOptions: tri,
  /** null = opening hours unknown */
  openingHours: WeeklyHoursSchema.nullable(),
  /** Ratings as published by each source, on that source's own scale. */
  ratings: z.array(RatingSchema),
  /** The single consistent rating source used to break ties (0–5). */
  primaryRating: z.strictObject({ value: z.number().min(0).max(5), reviewCount: z.number().int().min(0) }).nullable(),
  /** travel_time mode only; null = unknown. */
  travelMinutes: z.number().int().min(0).nullable(),
  /** Shown next to the travel time, e.g. that it is demo data. */
  travelNote: z.string().min(1).max(100),
  link: LinkSchema.nullable(),
  sourceIds: z.array(z.string()),
  /** Optional per-fact sources (live data). When missing, sourceIds is used. */
  factSources: z.partialRecord(z.enum(FACT_KEYS), z.array(z.string())).optional(),
  /** Menu items related to a participant's outing text, by token (live data). */
  textMatches: z.partialRecord(token, z.array(z.string().min(1).max(60)).min(1)).optional(),
  /** Short sourced description of the restaurant (no fit claims). */
  description: z.string().min(1).max(400).optional(),
  /** Short note per token on what is relevant to that participant's food preference. */
  participantNotes: z.partialRecord(token, z.string().min(1).max(300)).optional(),
})

export const ResearchResultSchema = z.strictObject({
  dataSource: z.enum(['demo', 'live']),
  candidates: z.array(CandidateSchema),
  sources: z.array(SourceSchema),
})

export type Tri = z.infer<typeof tri>
export type WeeklyHours = z.infer<typeof WeeklyHoursSchema>
export type Candidate = z.infer<typeof CandidateSchema>
export type ResearchResult = z.infer<typeof ResearchResultSchema>

/** Operational numbers only — never content. */
export interface ProviderMetrics {
  providerMs?: number
  searchCalls?: number
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  candidatesReturned?: number
  candidatesKept?: number
  /** Parallel research calls made / failed. */
  calls?: number
  failedCalls?: number
  model?: string
}

export interface ResearchInput {
  request: SearchRequest
  maxCandidates: number
  signal: AbortSignal
  /** Called by live providers with operational metrics. */
  onMetrics?: (metrics: ProviderMetrics) => void
}

export interface ResearchProvider {
  research(input: ResearchInput): Promise<unknown>
}
