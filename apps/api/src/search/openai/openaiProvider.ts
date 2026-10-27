// Live research provider: OpenAI Responses calls with a forced web search,
// store=false, no conversations / background mode. By default one call
// (PARALLEL_SEARCHES=1). The work can be split into parallel calls, each
// finding part of the candidates from a different angle; measured in
// Milestone 4, two calls were not faster (each still runs its own searches).
// The model returns facts with numbered sources; mapper.ts keeps only facts
// whose source the search really returned. A call that fails or breaks is
// dropped whole (never partial JSON); if every call fails, the search fails.
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import type { Response, ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses'
import type { OpenAIConfig } from '../../config'
import { ApiError } from '../../http/errors'
import type { Candidate, ProviderMetrics, ResearchInput, ResearchProvider, ResearchResult } from '../researchProvider'
import { mapCandidates, setPrimaryRatings } from './mapper'
import { ModelOutputSchema, type ModelOutput } from './outputSchema'
import { buildInput, buildInstructions, SEARCH_FOCUS } from './prompt'
import { SourceRegistry, type FoundPage } from './sources'

/** The one SDK call we use (injected so tests run without network or cost). */
export interface ResponsesClient {
  create(body: ResponseCreateParamsNonStreaming, options: { signal: AbortSignal }): Promise<Response>
}

export class ProviderOutputError extends Error {
  constructor(readonly reason: string) {
    super(reason)
  }
}

export function sdkClient(apiKey: string, timeoutMs: number): ResponsesClient {
  const client = new OpenAI({ apiKey, maxRetries: 0, timeout: timeoutMs })
  return { create: (body, options) => client.responses.create(body, options) }
}

const TEXT_FORMAT = zodTextFormat(ModelOutputSchema, 'restaurant_research')

export function buildRequestBody(
  input: ResearchInput,
  config: OpenAIConfig,
  candidatesWanted = input.maxCandidates,
  focus?: string,
): ResponseCreateParamsNonStreaming {
  return {
    model: config.model,
    instructions: buildInstructions(candidatesWanted, focus),
    input: buildInput(input.request, candidatesWanted),
    tools: [
      {
        type: 'web_search',
        search_context_size: config.searchContextSize,
        user_location: { type: 'approximate', country: 'IL', timezone: 'Asia/Jerusalem' },
      },
    ],
    tool_choice: 'required',
    reasoning: { effort: 'low' },
    store: false,
    max_output_tokens: config.maxOutputTokens,
    // Cap on web search calls. Accepted by the API; missing from this SDK's request type.
    ...({ max_tool_calls: config.maxSearchCalls } as object),
    include: ['web_search_call.action.sources'],
    text: { format: { type: 'json_schema', name: TEXT_FORMAT.name, strict: true, schema: TEXT_FORMAT.schema } },
  }
}

/** Every page the search returned or opened, plus cited pages (with titles). */
export function foundPages(res: Response): FoundPage[] {
  const pages: FoundPage[] = []
  for (const item of res.output) {
    if (item.type === 'web_search_call') {
      const a = item.action
      if (a.type === 'search') for (const s of a.sources ?? []) pages.push({ url: s.url })
      else if (a.type === 'open_page' && a.url) pages.push({ url: a.url })
      else if (a.type === 'find_in_page') pages.push({ url: a.url })
    } else if (item.type === 'message') {
      for (const c of item.content) {
        if (c.type !== 'output_text') continue
        for (const ann of c.annotations) if (ann.type === 'url_citation') pages.push({ url: ann.url, title: ann.title })
      }
    }
  }
  return pages
}

function outputText(res: Response): string {
  let text = ''
  for (const item of res.output) {
    if (item.type !== 'message') continue
    for (const c of item.content) {
      if (c.type === 'refusal') throw new ProviderOutputError('refusal')
      if (c.type === 'output_text') text += c.text
    }
  }
  return text
}

/** Checks one response and returns its parsed output. Throws on anything wrong. */
function readResponse(res: Response): ModelOutput {
  // Proof that a real web search ran (not an answer from memory).
  const searches = res.output.filter((o) => o.type === 'web_search_call')
  if (!searches.some((s) => s.status === 'completed')) throw new ProviderOutputError('no_search')
  if (res.status !== 'completed') throw new ProviderOutputError(`status_${res.status ?? 'unknown'}`)
  let json: unknown
  try {
    json = JSON.parse(outputText(res))
  } catch (e) {
    if (e instanceof ProviderOutputError) throw e
    throw new ProviderOutputError('bad_json')
  }
  const parsed = ModelOutputSchema.safeParse(json)
  if (!parsed.success) throw new ProviderOutputError('schema')
  return parsed.data
}


export interface OpenAIProviderOptions {
  now?: () => Date
  /**
   * Time limit for each call, a bit under the search limit: a call that is
   * still running then is dropped, so the other calls' results are still used.
   */
  callTimeoutMs?: number
}

export function createOpenAIProvider(
  config: OpenAIConfig,
  client: ResponsesClient,
  { now = () => new Date(), callTimeoutMs }: OpenAIProviderOptions = {},
): ResearchProvider {
  return {
    async research(input: ResearchInput): Promise<ResearchResult> {
      const calls = Math.max(1, Math.min(config.parallelCalls, input.maxCandidates))
      const perCall = Math.ceil(input.maxCandidates / calls)
      const metrics: ProviderMetrics = { model: config.model, calls, failedCalls: 0, searchCalls: 0 }
      const started = Date.now()
      try {
        const settled = await Promise.allSettled(
          Array.from({ length: calls }, async (_, i) => {
            const focus = calls > 1 ? SEARCH_FOCUS[i % SEARCH_FOCUS.length] : undefined
            // Abort when the search is aborted, or when this call's own time is up.
            const own = callTimeoutMs ? AbortSignal.timeout(callTimeoutMs) : undefined
            let res: Response
            try {
              res = await client.create(buildRequestBody(input, config, perCall, focus), {
                signal: own ? AbortSignal.any([input.signal, own]) : input.signal,
              })
            } catch (e) {
              if (own?.aborted) throw new ProviderOutputError('call_timeout')
              throw e
            }
            metrics.inputTokens = (metrics.inputTokens ?? 0) + (res.usage?.input_tokens ?? 0)
            metrics.outputTokens = (metrics.outputTokens ?? 0) + (res.usage?.output_tokens ?? 0)
            metrics.reasoningTokens =
              (metrics.reasoningTokens ?? 0) + (res.usage?.output_tokens_details?.reasoning_tokens ?? 0)
            metrics.searchCalls! += res.output.filter((o) => o.type === 'web_search_call').length
            return { res, output: readResponse(res) }
          }),
        )
        metrics.providerMs = Date.now() - started

        const ok = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value)
        metrics.failedCalls = settled.length - ok.length
        if (ok.length === 0) {
          const reasons = settled.map((s) => (s as PromiseRejectedResult).reason)
          if (reasons.every((r) => r instanceof ProviderOutputError && r.reason === 'call_timeout')) {
            throw new ApiError('SEARCH_TIMEOUT')
          }
          throw reasons.find((r) => !(r instanceof ProviderOutputError && r.reason === 'call_timeout')) ?? reasons[0]
        }

        // One registry for every page any call's search returned.
        const registry = new SourceRegistry(
          ok.flatMap((x) => foundPages(x.res)),
          now().toISOString(),
        )
        const lists = ok.map((x) => mapCandidates(x.output.candidates, x.output.sources, input.request, registry, perCall))
        metrics.candidatesReturned = lists.reduce((sum, l) => sum + l.returned, 0)

        // Interleave the calls' lists, drop repeats, keep at most maxCandidates.
        const merged: Candidate[] = []
        const seen = new Set<string>()
        for (let i = 0; merged.length < input.maxCandidates && lists.some((l) => i < l.candidates.length); i++) {
          for (const l of lists) {
            const c = l.candidates[i]
            if (!c || seen.has(c.restaurantId) || merged.length >= input.maxCandidates) continue
            seen.add(c.restaurantId)
            merged.push(c)
          }
        }
        setPrimaryRatings(merged)
        metrics.candidatesKept = merged.length

        const usedIds = new Set(merged.flatMap((c) => c.sourceIds))
        return { dataSource: 'live', candidates: merged, sources: registry.used().filter((s) => usedIds.has(s.id)) }
      } finally {
        metrics.providerMs ??= Date.now() - started
        input.onMetrics?.(metrics)
      }
    },
  }
}
