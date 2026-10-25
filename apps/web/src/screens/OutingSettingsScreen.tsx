import { useEffect, useId, useRef, useState, type FocusEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { personsRepository } from '../db'
import { useOuting } from '../state/OutingContext'
import { orderSelection } from '../state/outingSelection'
import { INDIFFERENT_LABEL } from '../catalogs/foodTypes'
import {
  AREAS,
  ATMOSPHERES,
  BUDGET_RANGES,
  KOSHER_OPTIONS,
  MAX_ATMOSPHERES,
  ORIGIN_SOURCES,
  SEARCH_MODES,
  TRAVEL_MINUTES,
  type Atmosphere,
  type BudgetRange,
  type Kosher,
  type OriginSource,
  type SearchMode,
  type TravelMinutes,
} from '../catalogs/outing'
import { isOutingFoodValid, outingFoodOf } from '../domain/outingFood'
import {
  ADDRESS_MAX,
  settingsIssues,
  toggleArea,
  toggleAtmosphere,
  toggleBudget,
  type OutingSettings,
} from '../domain/outingSettings'
import { buildSearchRequest } from '../domain/searchRequest'
import { newRequestId } from '../domain/requestId'
import { postRecommendations, SearchCancelled, SearchError } from '../api/client'
import { startSession } from '../state/searchSession'
import { defaultVisit, israelLocal, isPastVisit, type LocalDateTime } from '../domain/visitTime'
import { getCurrentPosition } from '../platform/geolocation'
import { ScreenHeader } from '../components/ScreenHeader'
import { MultiChipGroup, SingleChipGroup } from '../components/ChipGroup'
import { SearchStatus, type SearchState } from '../components/SearchStatus'
import { ChevronDownIcon } from '../components/icons'

type LocationStatus = 'idle' | 'locating' | 'ok' | 'failed'

const TRAVEL_OPTIONS = TRAVEL_MINUTES.map((m) => ({ id: String(m), label: `${m} דקות` }))

/** Re-render periodically so "past visit" checks stay current while the screen is open. */
function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** Screen 04 — "הגדרות היציאה" */
export function OutingSettingsScreen() {
  const persons = useLiveQuery(() => personsRepository.list(), [])
  const navigate = useNavigate()
  const { selectedIds, foodByPerson, settings, updateSettings, setSession } = useOuting()
  const now = useNow(30_000)
  const dateId = useId()
  const timeId = useId()
  const addressId = useId()
  const extrasId = useId()

  const [locationStatus, setLocationStatus] = useState<LocationStatus>(settings.currentLocation ? 'ok' : 'idle')
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [searchState, setSearchState] = useState<SearchState>({ kind: 'idle' })
  const inFlight = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const [visitRejected, setVisitRejected] = useState(false)
  const lastValidVisit = useRef(settings.visit)

  // Leaving the screen cancels a running search.
  useEffect(() => () => abortRef.current?.abort(), [])

  if (selectedIds.length === 0) return <Navigate to="/" replace />
  if (!selectedIds.every((id) => isOutingFoodValid(outingFoodOf(foodByPerson, id)))) {
    return <Navigate to="/outing/preferences" replace />
  }
  if (!persons) return <main className="screen" />

  // A change clears an earlier error message.
  const update = (patch: Partial<OutingSettings>) => {
    updateSettings(patch)
    setSearchState((s) => (s.kind === 'error' ? { kind: 'idle' } : s))
  }

  async function requestCurrentLocation() {
    update({ originSource: 'current_location' })
    setLocationStatus('locating')
    try {
      const point = await getCurrentPosition()
      updateSettings({ currentLocation: point })
      setLocationStatus('ok')
    } catch {
      setLocationStatus((s) => (s === 'locating' ? 'failed' : s))
    }
  }

  function onOriginChange(source: OriginSource) {
    if (source === 'current_location') void requestCurrentLocation()
    else update({ originSource: source })
  }

  const issues = settingsIssues(settings, now)
  const nowInIsrael = israelLocal(now)
  const today = nowInIsrael.date
  const showPastError = visitRejected || issues.includes('past_visit')

  function changeVisit(next: LocalDateTime) {
    setVisitRejected(false)
    update({ visit: next })
  }

  // Native fields are edited piece by piece (e.g. hour, then AM/PM), so the
  // check runs when focus leaves the date+time pair: a past (or incomplete)
  // value is not kept and the fields return to the last future value.
  function onVisitBlur(e: FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    const current = new Date()
    if (!isPastVisit(settings.visit, current)) {
      lastValidVisit.current = settings.visit
      return
    }
    const fallback = isPastVisit(lastValidVisit.current, current) ? defaultVisit(current) : lastValidVisit.current
    setVisitRejected(true)
    update({ visit: fallback })
  }

  async function search() {
    if (inFlight.current) return // no double submit
    const current = new Date()
    if (settingsIssues(settings, current).length > 0 || !persons) return
    const byId = new Map(persons.map((p) => [p.id, p]))
    const ordered = orderSelection(
      selectedIds,
      persons.map((p) => p.id),
    )
      .map((id) => byId.get(id))
      .filter((p) => p !== undefined)
    const built = buildSearchRequest({ participants: ordered, foodByPerson, settings, requestId: newRequestId() })

    inFlight.current = true
    setSearchState({ kind: 'loading' })
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await postRecommendations(built.request, { signal: controller.signal })
      setSession(startSession(built, res))
      navigate('/outing/results')
    } catch (e) {
      if (e instanceof SearchCancelled) return
      setSearchState({ kind: 'error', code: e instanceof SearchError ? e.code : 'PROVIDER_UNAVAILABLE' })
    } finally {
      inFlight.current = false
    }
  }

  return (
    <main className="screen">
      <ScreenHeader title="הגדרות היציאה" />

      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        {/* Date and time of the visit (Israel time) */}
        <div className="field-group" role="group" aria-labelledby={`${dateId}-label`}>
          <span id={`${dateId}-label`} className="label">
            תאריך ושעת הביקור
          </span>
          <div className="datetime-row" onBlur={onVisitBlur}>
            <input
              id={dateId}
              type="date"
              className="input"
              aria-label="תאריך"
              min={today}
              value={settings.visit.date}
              aria-invalid={showPastError}
              aria-describedby={showPastError ? `${dateId}-error` : undefined}
              onChange={(e) => changeVisit({ ...settings.visit, date: e.target.value })}
            />
            <input
              id={timeId}
              type="time"
              className="input"
              aria-label="שעה"
              min={settings.visit.date === today ? nowInIsrael.time : undefined}
              value={settings.visit.time}
              aria-invalid={showPastError}
              aria-describedby={showPastError ? `${dateId}-error` : undefined}
              onChange={(e) => changeVisit({ ...settings.visit, time: e.target.value })}
            />
          </div>
          {showPastError && (
            <p id={`${dateId}-error`} className="field-error" role="alert">
              בחרו מועד עתידי
            </p>
          )}
        </div>

        {/* Search mode */}
        <section className="field-group">
          <h2 className="label">איפה מחפשים?</h2>
          <SingleChipGroup<SearchMode>
            label="איפה מחפשים?"
            options={SEARCH_MODES}
            value={settings.searchMode}
            onChange={(searchMode) => update({ searchMode })}
          />
        </section>

        {settings.searchMode === 'travel_time' && (
          <>
            <section className="field-group">
              <h2 className="label">נקודת מוצא</h2>
              <SingleChipGroup<OriginSource>
                label="נקודת מוצא"
                options={ORIGIN_SOURCES}
                value={settings.originSource}
                onChange={onOriginChange}
              />
              {settings.originSource === 'current_location' && locationStatus === 'locating' && (
                <p className="muted small" aria-live="polite">
                  מאתרים את המיקום…
                </p>
              )}
              {settings.originSource === 'current_location' && locationStatus === 'ok' && (
                <p className="status-ok small" aria-live="polite">
                  המיקום התקבל
                </p>
              )}
              {settings.originSource === 'current_location' && locationStatus === 'failed' && (
                <p className="field-error" role="alert">
                  לא ניתן לקבל את המיקום. אפשר להזין כתובת או לחפש לפי ערים / אזורים.
                </p>
              )}
              {settings.originSource === 'manual_address' && (
                <input
                  id={addressId}
                  className="input user-text"
                  aria-label="כתובת מוצא"
                  placeholder="הזינו כתובת מוצא"
                  autoComplete="street-address"
                  maxLength={ADDRESS_MAX}
                  value={settings.manualAddress}
                  onChange={(e) => update({ manualAddress: e.target.value.slice(0, ADDRESS_MAX) })}
                />
              )}
            </section>

            <section className="field-group">
              <h2 className="label">זמן נסיעה מרבי</h2>
              <SingleChipGroup
                label="זמן נסיעה מרבי"
                options={TRAVEL_OPTIONS}
                value={String(settings.maxTravelMinutes)}
                onChange={(v) => update({ maxTravelMinutes: Number(v) as TravelMinutes })}
              />
            </section>
          </>
        )}

        {settings.searchMode === 'areas' && (
          <section className="field-group">
            <h2 className="label">ערים / אזורים</h2>
            <p className="muted small">אפשר לבחור כמה אזורים</p>
            <MultiChipGroup
              label="ערים / אזורים"
              options={AREAS}
              selected={settings.areaIds}
              onToggle={(id) => update({ areaIds: toggleArea(settings.areaIds, id) })}
            />
          </section>
        )}

        {/* Budget per person */}
        <section className="field-group">
          <h2 className="label">תקציב לאדם</h2>
          <MultiChipGroup
            label="תקציב לאדם"
            options={BUDGET_RANGES}
            selected={settings.budgetRanges}
            onToggle={(id) => update({ budgetRanges: toggleBudget(settings.budgetRanges, id as BudgetRange) })}
            indifferent={{ label: INDIFFERENT_LABEL, onSelect: () => update({ budgetRanges: [] }) }}
          />
        </section>

        {/* Collapsible extra preferences */}
        <section className="extras">
          <button
            type="button"
            className="extras-toggle"
            aria-expanded={extrasOpen}
            aria-controls={extrasId}
            onClick={() => setExtrasOpen((o) => !o)}
          >
            <span className="section-title">העדפות נוספות</span>
            <ChevronDownIcon className="extras-chevron" />
          </button>
          {extrasOpen && (
            <div id={extrasId} className="stack" style={{ gap: 'var(--space-3)' }}>
              <div className="field-group">
                <h3 className="label">כשרות</h3>
                <SingleChipGroup<Kosher>
                  label="כשרות"
                  options={KOSHER_OPTIONS}
                  value={settings.kosher}
                  onChange={(kosher) => update({ kosher })}
                />
              </div>
              <div className="field-group">
                <h3 className="label">אווירה</h3>
                <MultiChipGroup
                  label="אווירה"
                  options={ATMOSPHERES}
                  selected={settings.atmospheres}
                  max={MAX_ATMOSPHERES}
                  onToggle={(id) => update({ atmospheres: toggleAtmosphere(settings.atmospheres, id as Atmosphere) })}
                  indifferent={{ label: INDIFFERENT_LABEL, onSelect: () => update({ atmospheres: [] }) }}
                />
                {settings.atmospheres.length >= MAX_ATMOSPHERES && (
                  <p className="muted small" aria-live="polite">
                    אפשר לבחור עד שתי אווירות
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="spacer" />

      <div className="field-group">
        <button
          type="button"
          className="btn btn--primary"
          disabled={issues.length > 0 || searchState.kind === 'loading'}
          onClick={() => void search()}
        >
          מצאו לנו מסעדות
        </button>
        {issues.includes('no_area') && <p className="hint">בחרו לפחות אזור אחד</p>}
        {issues.includes('no_origin') && <p className="hint">בחרו את המיקום הנוכחי או הזינו כתובת</p>}
        <SearchStatus state={searchState} loadingText="מחפשים מסעדות שיתאימו לכולם…" onRetry={() => void search()} />
      </div>
    </main>
  )
}
