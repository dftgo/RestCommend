import type { Response } from 'express'
import { ERROR_STATUS, type ErrorCode } from '@restcommend/contracts'

/** An error with a public code. `detail` is an internal tag for logs (no user data). */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly detail?: string,
  ) {
    super(code)
  }
}

export function sendError(res: Response, code: ErrorCode, status = ERROR_STATUS[code], detail?: string) {
  res.locals.errorCode = detail ? `${code}:${detail}` : code
  res.status(status).json({ error: { code } })
}
