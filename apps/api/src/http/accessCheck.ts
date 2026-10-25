import { createHash, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { ACCESS_KEY_HEADER } from '@restcommend/contracts'
import { sendError } from './errors'

const digest = (s: string) => createHash('sha256').update(s).digest()

/** Rejects any request without the shared key, before any other work. */
export function accessCheck(expectedKey: string): RequestHandler {
  const expected = digest(expectedKey)
  return (req, res, next) => {
    const given = req.get(ACCESS_KEY_HEADER)
    // Constant-time compare of fixed-length hashes.
    if (!given || !timingSafeEqual(digest(given), expected)) {
      sendError(res, 'UNAUTHORIZED')
      return
    }
    next()
  }
}
