// Calls the server. Nothing from the request or the response is logged.
import {
  ACCESS_KEY_HEADER,
  ErrorBodySchema,
  RecommendationsResponseSchema,
  type ErrorCode,
  type RecommendationsResponse,
  type SearchRequest,
} from '@restcommend/contracts'
import type { SearchErrorCode } from '../domain/errors'

/** The app waits up to 60 seconds (the server stops at 55). */
/** A bit longer than the server's 90-second search limit, so the server's own timeout answer arrives first. */
export const CLIENT_TIMEOUT_MS = 95_000

export class SearchError extends Error {
  constructor(readonly code: SearchErrorCode) {
    super(code)
  }
}

/** Thrown when the caller cancelled the request (e.g. left the screen). */
export class SearchCancelled extends Error {}

interface Options {
  signal?: AbortSignal
  timeoutMs?: number
  accessKey?: string
  fetchImpl?: typeof fetch
  isOnline?: () => boolean
}

const STATUS_CODES: Record<number, ErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  413: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  504: 'SEARCH_TIMEOUT',
}

const browserOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false

export async function postRecommendations(request: SearchRequest, options: Options = {}): Promise<RecommendationsResponse> {
  const {
    signal,
    timeoutMs = CLIENT_TIMEOUT_MS,
    accessKey = import.meta.env.VITE_APP_ACCESS_KEY ?? '',
    fetchImpl = fetch,
    isOnline = browserOnline,
  } = options

  if (!isOnline()) throw new SearchError('OFFLINE')

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onCancel = () => controller.abort()
  signal?.addEventListener('abort', onCancel)

  try {
    let res: Response
    try {
      res = await fetchImpl('/v1/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [ACCESS_KEY_HEADER]: accessKey },
        body: JSON.stringify(request),
        signal: controller.signal,
      })
    } catch {
      if (timedOut) throw new SearchError('SEARCH_TIMEOUT')
      if (signal?.aborted) throw new SearchCancelled()
      throw new SearchError(isOnline() ? 'PROVIDER_UNAVAILABLE' : 'OFFLINE')
    }

    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = null
    }
    if (!res.ok) {
      const parsed = ErrorBodySchema.safeParse(body)
      throw new SearchError(parsed.success ? parsed.data.error.code : (STATUS_CODES[res.status] ?? 'PROVIDER_UNAVAILABLE'))
    }
    const parsed = RecommendationsResponseSchema.safeParse(body)
    if (!parsed.success) throw new SearchError('PROVIDER_UNAVAILABLE')
    return parsed.data
  } catch (e) {
    if (e instanceof SearchError || e instanceof SearchCancelled) throw e
    if (timedOut) throw new SearchError('SEARCH_TIMEOUT')
    if (signal?.aborted) throw new SearchCancelled()
    throw new SearchError('PROVIDER_UNAVAILABLE')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onCancel)
  }
}
