import { canRetry, errorMessage, type SearchErrorCode } from '../domain/errors'

export type SearchState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; code: SearchErrorCode }

interface Props {
  state: SearchState
  loadingText: string
  onRetry: () => void
}

/** Loading text or an error message with "ניסיון חוזר", shown next to the action. */
export function SearchStatus({ state, loadingText, onRetry }: Props) {
  if (state.kind === 'loading') {
    return (
      <p className="search-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        {loadingText}
      </p>
    )
  }
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
