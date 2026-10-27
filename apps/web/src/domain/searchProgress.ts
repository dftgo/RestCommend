// Estimated wait shown while a live search runs. Most searches finish within
// a minute and the server stops at 90 seconds (ARCHITECTURE ADR-10), so the
// countdown targets 60 seconds and then counts the remaining time to 90.

export const EXPECTED_SECONDS = 60
export const LIMIT_SECONDS = 90

/** Share of the bar filled when the usual time is reached; the rest is the overtime part. */
const EXPECTED_SHARE = 0.8
const MAX_SHARE = 0.97

export interface SearchProgress {
  /** 0–1, for the progress bar. Never reaches 1 before the answer arrives. */
  fraction: number
  /** Hebrew text for the user. */
  text: string
}

export function searchProgress(elapsedSeconds: number): SearchProgress {
  const elapsed = Math.max(0, Math.floor(elapsedSeconds))
  if (elapsed < EXPECTED_SECONDS) {
    const left = EXPECTED_SECONDS - elapsed
    return {
      fraction: (elapsed / EXPECTED_SECONDS) * EXPECTED_SHARE,
      text: left > 1 ? `נותרו כ־${left} שניות` : 'עוד כמה שניות…',
    }
  }
  if (elapsed < LIMIT_SECONDS) {
    const over = (elapsed - EXPECTED_SECONDS) / (LIMIT_SECONDS - EXPECTED_SECONDS)
    const left = LIMIT_SECONDS - elapsed
    return {
      fraction: EXPECTED_SHARE + over * (MAX_SHARE - EXPECTED_SHARE),
      text: left > 1 ? `לוקח יותר מהרגיל — עד ${left} שניות נוספות` : 'עוד רגע…',
    }
  }
  return { fraction: MAX_SHARE, text: 'עוד רגע…' }
}
