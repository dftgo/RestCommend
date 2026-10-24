import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { personsRepository } from '../db'
import { useOuting } from '../state/OutingContext'
import { MAX_PARTICIPANTS } from '../state/outingSelection'
import { ScreenHeader } from '../components/ScreenHeader'
import { PersonCard } from '../components/PersonCard'
import { InstallBanner } from '../components/InstallBanner'
import { BottomNav } from '../components/BottomNav'
import { PlusIcon } from '../components/icons'

function countText(n: number): string {
  return n === 1 ? 'משתתף אחד נבחר' : `${n} משתתפים נבחרו`
}

/** Screen 01 — "מי מצטרף?" */
export function WhoIsJoiningScreen() {
  const navigate = useNavigate()
  const persons = useLiveQuery(() => personsRepository.list(), [])
  const { selectedIds, toggle, prune } = useOuting()
  const [limitHit, setLimitHit] = useState(false)

  // Keep the selection in sync with profiles that still exist.
  useEffect(() => {
    if (persons) prune(persons.map((p) => p.id))
  }, [persons, prune])

  const onToggle = (id: string) => setLimitHit(!toggle(id))
  const count = selectedIds.length

  return (
    <>
      <main className="screen screen--with-nav">
        <InstallBanner />
        <ScreenHeader title="מי מצטרף?" />
        <p className="muted">בחרו מתוך האנשים ששמרתם</p>

        {persons && persons.length === 0 && (
          <p className="empty-state">עדיין לא הוספתם אנשים. הוסיפו את מי שיוצא איתכם.</p>
        )}

        {persons && persons.length > 0 && (
          <div className="stack">
            {persons.map((p) => (
              <PersonCard key={p.id} person={p} selected={selectedIds.includes(p.id)} onToggle={() => onToggle(p.id)} />
            ))}
          </div>
        )}

        <Link to="/people/new" className="btn btn--secondary">
          <PlusIcon size={20} />
          הוספת אדם
        </Link>

        {persons && persons.length > 0 && <p aria-live="polite">{countText(count)}</p>}
        {limitHit && (
          <p className="notice" role="alert">
            אפשר לבחור עד {MAX_PARTICIPANTS} משתתפים
          </p>
        )}

        <div className="spacer" />

        <div className="field-group">
          <button
            type="button"
            className="btn btn--primary"
            disabled={count === 0}
            onClick={() => navigate('/outing/preferences')}
          >
            המשך להעדפות היציאה
          </button>
          {count === 0 && <p className="hint">בחרו לפחות משתתף אחד</p>}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
