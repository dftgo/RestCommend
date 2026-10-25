import { Navigate, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { personsRepository } from '../db'
import { useOuting } from '../state/OutingContext'
import { orderSelection } from '../state/outingSelection'
import { isOutingFoodValid, outingFoodOf } from '../domain/outingFood'
import { ScreenHeader } from '../components/ScreenHeader'
import { ParticipantFoodCard } from '../components/ParticipantFoodCard'

/** Screen 03 — "מה בא לכם הפעם?" */
export function OutingPreferencesScreen() {
  const navigate = useNavigate()
  const persons = useLiveQuery(() => personsRepository.list(), [])
  const { selectedIds, foodByPerson, updateFood } = useOuting()

  if (selectedIds.length === 0) return <Navigate to="/" replace />
  if (!persons) return <main className="screen" />

  const byId = new Map(persons.map((p) => [p.id, p]))
  const ordered = orderSelection(
    selectedIds,
    persons.map((p) => p.id),
  )
  const allValid = ordered.every((pid) => isOutingFoodValid(outingFoodOf(foodByPerson, pid)))

  return (
    <main className="screen">
      <ScreenHeader title="מה בא לכם הפעם?" />
      <p className="muted">אפשר לדלג ולהשתמש בפרופיל השמור</p>

      <div className="stack">
        {ordered.map((pid) => {
          const person = byId.get(pid)
          if (!person) return null
          return (
            <ParticipantFoodCard
              key={pid}
              person={person}
              food={outingFoodOf(foodByPerson, pid)}
              onChange={(patch) => updateFood(pid, patch)}
            />
          )
        })}
      </div>

      <div className="spacer" />

      <button
        type="button"
        className="btn btn--primary"
        disabled={!allValid}
        onClick={() => navigate('/outing/settings')}
      >
        המשך להגדרות המשותפות
      </button>
    </main>
  )
}
