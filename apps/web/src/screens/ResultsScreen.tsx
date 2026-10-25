import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Source } from '@restcommend/contracts'
import { personsRepository } from '../db'
import { useOuting } from '../state/OutingContext'
import { allRestaurants, appendBatch, moreFailed, moreLoading, moreRequest } from '../state/searchSession'
import { postRecommendations, SearchCancelled, SearchError } from '../api/client'
import {
  batchStartRanks,
  countLine,
  fewerMessage,
  NO_MORE,
  NONE_FOUND,
  participantName,
  sessionShareText,
} from '../domain/results'
import { newRequestId } from '../domain/requestId'
import { shareText, type ShareOutcome } from '../platform/share'
import { ScreenHeader } from '../components/ScreenHeader'
import { RestaurantCard } from '../components/RestaurantCard'
import { SearchStatus, type SearchState } from '../components/SearchStatus'

const SHARE_MESSAGES: Partial<Record<ShareOutcome, string>> = {
  copied: 'הטקסט הועתק — אפשר להדביק אותו בכל אפליקציה',
  failed: 'לא ניתן לשתף כרגע',
}

/** Screen 05 — "ההמלצות שלכם" */
export function ResultsScreen() {
  const { session, setSession } = useOuting()
  const persons = useLiveQuery(() => personsRepository.list(), [])
  const firstId = session?.batches[0]?.restaurants[0]?.restaurantId
  const [open, setOpen] = useState<Record<string, boolean>>(() => (firstId ? { [firstId]: true } : {}))
  const [shareNote, setShareNote] = useState<string | null>(null)
  const inFlight = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const namesById = useMemo(() => new Map((persons ?? []).map((p) => [p.id, p.displayName])), [persons])

  if (!session) return <Navigate to="/" replace />

  const restaurants = allRestaurants(session)
  const sources = new Map<string, Source>()
  for (const s of session.sources) sources.set(s.id, s)
  const first = session.batches[0]
  const starts = batchStartRanks(session.batches.map((b) => b.restaurants.length))
  const nameOf = (token: string) => participantName(token, session.participantMap, namesById)

  async function loadMore() {
    if (!session || inFlight.current) return
    inFlight.current = true
    const request = moreRequest(session, newRequestId())
    setSession((s) => (s ? moreLoading(s) : s))
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await postRecommendations(request, { signal: controller.signal })
      setSession((s) => (s ? appendBatch(s, res) : s))
    } catch (e) {
      if (e instanceof SearchCancelled) return
      const code = e instanceof SearchError ? e.code : 'PROVIDER_UNAVAILABLE'
      setSession((s) => (s ? moreFailed(s, code) : s))
    } finally {
      inFlight.current = false
    }
  }

  async function share() {
    if (!session) return
    setShareNote(null)
    const outcome = await shareText(sessionShareText(session))
    setShareNote(SHARE_MESSAGES[outcome] ?? null)
  }

  const moreState: SearchState =
    session.more.status === 'loading'
      ? { kind: 'loading' }
      : session.more.status === 'error'
        ? { kind: 'error', code: session.more.code }
        : { kind: 'idle' }

  return (
    <main className="screen">
      <ScreenHeader title="ההמלצות שלכם" />

      {restaurants.length > 0 && <p className="muted">{countLine(restaurants.length)}</p>}
      {session.dataSource === 'demo' && (
        <p className="demo-banner" role="note">
          נתוני דוגמה — המסעדות, המחירים, הדירוגים וזמני הנסיעה אינם אמיתיים
        </p>
      )}

      {first.restaurants.length === 0 && <p className="empty-state">{NONE_FOUND}</p>}
      {first.fewerResultsReason === 'fewer_than_five' && first.restaurants.length > 0 && (
        <p className="notice-box">{fewerMessage(first.restaurants.length)}</p>
      )}

      {session.batches.map((batch, bi) => (
        <section key={bi} className="stack" aria-label={bi === 0 ? 'ההמלצות' : 'המלצות נוספות'}>
          {bi > 0 && <h2 className="section-title">המלצות נוספות</h2>}
          {batch.restaurants.map((r, i) => (
            <RestaurantCard
              key={r.restaurantId}
              restaurant={r}
              rank={starts[bi] + i}
              expanded={Boolean(open[r.restaurantId])}
              onToggle={() => setOpen((o) => ({ ...o, [r.restaurantId]: !o[r.restaurantId] }))}
              searchMode={session.baseRequest.searchMode}
              dataSource={session.dataSource}
              sources={sources}
              nameOf={nameOf}
            />
          ))}
        </section>
      ))}

      {restaurants.length > 0 && (
        <div className="field-group results-actions">
          {session.more.status === 'exhausted' ? (
            <p className="notice-box">{NO_MORE}</p>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--primary"
                disabled={session.more.status === 'loading'}
                onClick={() => void loadMore()}
              >
                המלצות נוספות
              </button>
              <SearchStatus state={moreState} loadingText="מחפשים מסעדות נוספות…" onRetry={() => void loadMore()} />
            </>
          )}
          <button type="button" className="btn btn--secondary" onClick={() => void share()}>
            שיתוף מסעדות והסבר קבוצתי
          </button>
          {shareNote && (
            <p className="hint" role="status">
              {shareNote}
            </p>
          )}
        </div>
      )}
    </main>
  )
}
