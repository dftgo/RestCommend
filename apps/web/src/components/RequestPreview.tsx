import type { SearchRequest } from '../domain/searchRequest'

/**
 * Temporary (Milestone 2 only): shows the built search request so it can be
 * checked by eye. Removed in Milestone 3 when the real search exists.
 */
export function RequestPreview({ request }: { request: SearchRequest }) {
  return (
    <section className="request-preview" aria-live="polite">
      <p className="request-preview-title">בקשת החיפוש מוכנה. החיפוש עצמו ייבנה באבן הדרך הבאה.</p>
      <pre dir="ltr" className="request-preview-json">
        {JSON.stringify(request, null, 2)}
      </pre>
    </section>
  )
}
