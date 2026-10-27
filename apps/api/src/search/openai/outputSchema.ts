// What the model must return (strict JSON schema). Every field is required;
// "not found" is null / "unknown" / an empty list. Lengths and value ranges are
// checked afterwards in code (mapper.ts), not trusted from the model.
//
// Kept short on purpose: answer length is what makes a search slow. Each source
// URL is written once in `sources` and facts refer to it by number, and only
// the opening hours we use (the visit day and the day before) are asked for.
import { z } from 'zod'
import { AREA_IDS, ATMOSPHERE_IDS, FOOD_TYPE_IDS } from '@restcommend/contracts'

const refs = z.array(z.number()).describe('Numbers of the entries in "sources" that state this fact')
const tri = z.enum(['yes', 'no', 'unknown'])

const Interval = z.strictObject({
  open: z.string().describe('HH:MM, 24h'),
  close: z.string().describe('HH:MM, 24h; earlier than open means after midnight'),
})
/** [] = closed that day; null = unknown. */
const Day = z.array(Interval).nullable()

export const ModelCandidateSchema = z.strictObject({
  name: z.string().describe('Restaurant name as commonly written, including the branch when it has several'),
  city: z.string().describe('City in Hebrew'),
  address: z.string().describe('Street address of this branch, in Hebrew'),
  areaId: z.enum(AREA_IDS).nullable(),
  cuisines: z.array(z.enum(FOOD_TYPE_IDS)).nullable().describe('Catalog cuisines it serves; [] if none of them; null if unknown'),
  cuisineRefs: refs,
  menuHighlights: z.array(z.string()).describe('Up to 5 short dish names in Hebrew'),
  menuRefs: refs,
  textMatches: z
    .array(z.strictObject({ token: z.string(), dishes: z.array(z.string()), refs }))
    .describe('For participants with outing text: dishes on the menu related to that text'),
  price: z
    .strictObject({ min: z.number(), max: z.number() })
    .nullable()
    .describe('Typical price per person in ILS for a meal; null if no source gives prices'),
  priceRefs: refs,
  kosher: z.enum(['certified', 'no_pork_seafood', 'serves_pork_or_seafood', 'unknown']),
  kosherRefs: refs,
  atmospheres: z.array(z.enum(ATMOSPHERE_IDS)).nullable(),
  atmosphereRefs: refs,
  vegetarianOptions: tri,
  veganOptions: tri,
  dietRefs: refs,
  hoursVisitDay: Day.describe('Opening hours on the weekday of the visit'),
  hoursDayBefore: Day.describe('Opening hours on the weekday before the visit (for places open past midnight)'),
  hoursRefs: refs,
  ratings: z.array(
    z.strictObject({
      sourceName: z.string().describe('Site name, e.g. Google, TripAdvisor, Rest'),
      value: z.number(),
      scale: z.number().describe('Maximum of that site scale, e.g. 5 or 10'),
      reviewCount: z.number().nullable(),
      ref: z.number().describe('Number of the "sources" entry (page) where this rating appears'),
    }),
  ),
  websiteRef: z.number().nullable().describe('Number of the "sources" entry that is the official website; null if none'),
  description: z
    .string()
    .nullable()
    .describe('One or two Hebrew sentences on what is special about it, from the sources. No claims about who it suits.'),
  participantNotes: z
    .array(z.strictObject({ token: z.string(), note: z.string() }))
    .describe('Short Hebrew note per participant on what here relates to their food preference'),
})

export const ModelOutputSchema = z.strictObject({
  sources: z
    .array(z.strictObject({ n: z.number(), url: z.string() }))
    .describe('Every page you cite, once each, numbered from 1, with its exact URL'),
  candidates: z.array(ModelCandidateSchema),
})

export type ModelCandidate = z.infer<typeof ModelCandidateSchema>
export type ModelOutput = z.infer<typeof ModelOutputSchema>
export type ModelSource = ModelOutput['sources'][number]
