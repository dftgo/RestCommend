import { useEffect, useState } from 'react'
import { canRetry, errorMessage, type SearchErrorCode } from '../domain/errors'
import { searchProgress } from '../domain/searchProgress'

export type SearchState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; code: SearchErrorCode }

interface Props {
  state: SearchState
  loadingText: string
  onRetry: () => void
}

/** Loading text with an estimated countdown, or an error message with "ניסיון חוזר", shown next to the action. */
export function SearchStatus({ state, loadingText, onRetry }: Props) {
  if (state.kind === 'loading') return <SearchLoading text={loadingText} />
  if (state.kind === 'error') {
    return (
      <div className="search-error" role="alert">
        <p>{errorMessage(state.code)}</p>
        {canRetry(state.code) && (
          <button type="button" className="btn btn--secondary" onClick={onRetry}>
            ניסיון חוזר
          </button>
        )}
      </div>
    )
  }
  return null
}

/** Mounted once per search, so the countdown starts from zero each time. */
function SearchLoading({ text }: { text: string }) {
  const [started] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed((Date.now() - started) / 1000), 1000)
    return () => clearInterval(id)
  }, [started])
  const progress = searchProgress(elapsed)

  return (
    <div className="search-loading">
      <p className="search-loading__text" role="status">
        <span className="spinner" aria-hidden="true" />
        {text}
      </p>
      <div
        className="search-progress"
        role="progressbar"
        aria-label="זמן המתנה משוער"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.fraction * 100)}
        aria-valuetext={progress.text}
      >
        <div className="search-progress__fill" style={{ width: `${progress.fraction * 100}%` }} />
      </div>
      <p className="search-countdown" aria-hidden="true">
        {progress.text}
      </p>
    </div>
  )
}
