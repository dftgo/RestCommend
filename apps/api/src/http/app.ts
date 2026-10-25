import { randomUUID } from 'node:crypto'
import express, { type ErrorRequestHandler } from 'express'
import { SearchRequestSchema } from '@restcommend/contracts'
import type { Config } from '../config'
import type { Logger } from '../log'
import { runSearch } from '../search/orchestrator'
import type { ResearchProvider } from '../search/researchProvider'
import { accessCheck } from './accessCheck'
import { ApiError, sendError } from './errors'

export interface AppDeps {
  config: Config
  provider: ResearchProvider
  logger: Logger
  now?: () => Date
}

const BODY_LIMIT = '32kb'

export function createApp({ config, provider, logger, now = () => new Date() }: AppDeps) {
  const app = express()
  app.disable('x-powered-by')

  // Minimal operational log (no request content).
  app.use((req, res, next) => {
    const started = Date.now()
    const rid = randomUUID()
    const route = `${req.method} ${req.originalUrl.split('?')[0]}`
    res.on('finish', () => {
      logger.info({ rid, route, status: res.statusCode, ms: Date.now() - started, code: res.locals.errorCode })
    })
    next()
  })

  // The access key is checked before the body is even read.
  app.use('/v1', accessCheck(config.accessKey))
  app.use('/v1', express.json({ limit: BODY_LIMIT }))

  app.post('/v1/recommendations', async (req, res) => {
    const parsed = SearchRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, 'VALIDATION_ERROR')
      return
    }
    const response = await runSearch(parsed.data, {
      provider,
      searchTimeoutMs: config.searchTimeoutMs,
      maxCandidates: config.maxCandidates,
      ratingPriorWeight: config.ratingPriorWeight,
      now,
    })
    res.json(response)
  })

  app.use('/v1', (_req, res) => {
    res.status(404).json({ error: { code: 'VALIDATION_ERROR' } })
  })

  const onError: ErrorRequestHandler = (err, _req, res, next) => {
    if (res.headersSent) return next(err)
    if (err instanceof ApiError) return sendError(res, err.code, undefined, err.detail)
    const type = (err as { type?: string }).type
    if (type === 'entity.too.large') return sendError(res, 'VALIDATION_ERROR', 413, 'too_large')
    if (type === 'entity.parse.failed') return sendError(res, 'VALIDATION_ERROR', 400, 'bad_json')
    return sendError(res, 'PROVIDER_UNAVAILABLE', 503, 'internal')
  }
  app.use(onError)

  return app
}
