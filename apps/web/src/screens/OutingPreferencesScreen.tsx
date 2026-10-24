import { Navigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { personsRepository } from '../db'
import { useOuting } from '../state/OutingContext'
import { orderSelection } from '../state/outingSelection'
import { ScreenHeader } from '../components/ScreenHeader'

/**
 * Screen 03 — "מה בא לכם הפעם?"
 * Temporary version for Milestone 1: lists the selected participants only.
 * The full screen is built in Milestone 2.
 */
export function OutingPreferencesScreen() {
  const persons = useLiveQuery(() => personsRepository.list(), [])
  const { selectedIds } = useOuting()

  if (selectedIds.length === 0) return <Navigate to="/" replace />
  if (!persons) return <main className="screen" />

  const byId = new Map(persons.map((p) => [p.id, p]))
  const ordered = orderSelection(
    selectedIds,
    persons.map((p) => p.id),
  )

  return (
    <main className="screen">
      <ScreenHeader title="מה בא לכם הפעם?" />
      <div className="stack">
        {ordered.map((pid) => (
          <div key={pid} className="card">
            <bdi className="person-name user-text">{byId.get(pid)?.displayName}</bdi>
          </div>
        ))}
      </div>
      <p className="hint">המסך הזה ייבנה באבן הדרך הבאה</p>
    </main>
  )
}
