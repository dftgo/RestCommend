import { useId, useState } from 'react'
import type { DataSource, ParameterResult, Restaurant, SearchMode, Source } from '@restcommend/contracts'
import { linkLabel, matchSummaryText, PARAM_LABELS } from '../domain/results'
import { AlertIcon, ChevronDownIcon, ExternalLinkIcon, QuestionIcon } from './icons'

interface Props {
  restaurant: Restaurant
  rank: number
  expanded: boolean
  onToggle: () => void
  searchMode: SearchMode
  dataSource: DataSource
  sources: Map<string, Source>
  nameOf: (token: string) => string
}

const ltr = (text: string) => <bdi dir="ltr">{text}</bdi>

function paramTitle(p: ParameterResult, nameOf: (token: string) => string) {
  const label = PARAM_LABELS[p.param]
  return p.token ? (
    <>
      {label} (<bdi className="user-text-inline">{nameOf(p.token)}</bdi>)
    </>
  ) : (
    label
  )
}

/** Screen 05 restaurant card: text only, no image, no heart until Milestone 6. */
export function RestaurantCard({ restaurant: r, rank, expanded, onToggle, searchMode, dataSource, sources, nameOf }: Props) {
  const bodyId = useId()
  const peopleId = useId()
  const [peopleOpen, setPeopleOpen] = useState(false)
  const hasMismatch = r.matchSummary.mismatchCount > 0
  const linkedSources = r.sourceIds.map((id) => sources.get(id)).filter((s) => s !== undefined)

  return (
    <article className="card result-card">
      <h3 className="result-head">
        <button type="button" className="result-toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
          <span className="result-title">
            <span className="result-rank">{rank}.</span> <span className="user-text-inline">{r.name}</span>
          </span>
          <span className={hasMismatch ? 'result-summary result-summary--warn' : 'result-summary'}>
            {hasMismatch && <AlertIcon size={16} />}
            {matchSummaryText(r.matchSummary)}
          </span>
          <ChevronDownIcon className="result-chevron" />
        </button>
      </h3>

      {expanded && (
        <div id={bodyId} className="result-body">
          <p className="muted">{r.address}</p>

          <dl className="facts">
            <div>
              <dt>מחיר משוער לאדם:</dt>
              <dd>{r.priceEstimate ? ltr(`${r.priceEstimate.min}–${r.priceEstimate.max} ₪`) : 'לא נמצא מידע מאומת'}</dd>
            </div>
            {searchMode === 'travel_time' && (
              <div>
                <dt>זמן נסיעה משוער:</dt>
                <dd>
                  {r.travelEstimate ? (
                    <>
                      {ltr(`${r.travelEstimate.minutes}`)} דק׳
                      {dataSource === 'demo' && <span className="demo-tag"> ({r.travelEstimate.note})</span>}
                    </>
                  ) : (
                    'לא ניתן לאמת זמן נסיעה'
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt>דירוגים:</dt>
              <dd>
                {r.ratingsBySource.length === 0 ? (
                  'לא נמצא דירוג'
                ) : (
                  <ul className="plain-list">
                    {r.ratingsBySource.map((rt) => (
                      <li key={rt.sourceName}>
                        {rt.sourceName}: {ltr(`${rt.value}`)} מתוך {ltr(`${rt.scale}`)}
                        {rt.reviewCount !== undefined && <> · {ltr(rt.reviewCount.toLocaleString('he-IL'))} ביקורות</>}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>

          <section className="result-section">
            <h4 className="result-section-title">התאמה לקבוצה</h4>
            <p>{r.groupReason}</p>
          </section>

          <section className="result-section">
            <button
              type="button"
              className="subtoggle"
              aria-expanded={peopleOpen}
              aria-controls={peopleId}
              onClick={() => setPeopleOpen((o) => !o)}
            >
              <span className="result-section-title">התאמה לכל משתתף</span>
              <ChevronDownIcon className="result-chevron" />
            </button>
            {peopleOpen && (
              <ul id={peopleId} className="people-reasons">
                {r.perParticipantReasons.map((p) => (
                  <li key={p.token}>
                    <strong className="user-text-inline">{nameOf(p.token)}</strong>: {p.text}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {r.deviations.length > 0 && (
            <section className="result-section">
              <h4 className="result-section-title">חריגות מההעדפות</h4>
              <ul className="flag-list">
                {r.deviations.map((p, i) => (
                  <li key={i} className="flag flag--warn">
                    <AlertIcon size={16} className="flag-icon" />
                    <span>
                      <strong>{paramTitle(p, nameOf)}:</strong> {p.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.uncertainties.length > 0 && (
            <section className="result-section">
              <h4 className="result-section-title">פרטים שלא אומתו</h4>
              <ul className="flag-list">
                {r.uncertainties.map((p, i) => (
                  <li key={i} className="flag">
                    <QuestionIcon size={16} className="flag-icon" />
                    <span>
                      <strong>{paramTitle(p, nameOf)}:</strong> {p.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="result-links">
            {r.link ? (
              <a className="link" href={r.link.url} target="_blank" rel="noopener noreferrer">
                {linkLabel(r.link)}
                <ExternalLinkIcon size={16} />
              </a>
            ) : (
              <span className="muted">{linkLabel(null)}</span>
            )}
            {linkedSources.length > 0 && (
              <div className="sources">
                <span className="muted small">מקורות:</span>
                <ul className="plain-list">
                  {linkedSources.map((s) => (
                    <li key={s.id}>
                      <a className="link small" href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
