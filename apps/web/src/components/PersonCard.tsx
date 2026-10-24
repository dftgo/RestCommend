import { Link } from 'react-router'
import { summarizePerson, type Person } from '../domain/person'
import { PersonIcon } from './icons'

interface Props {
  person: Person
  selected: boolean
  onToggle: () => void
}

export function PersonCard({ person, selected, onToggle }: Props) {
  const checkboxId = `select-${person.id}`
  return (
    <div className="card person-card" data-selected={selected} onClick={onToggle}>
      <input
        id={checkboxId}
        type="checkbox"
        className="person-check"
        checked={selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <span className="avatar" aria-hidden="true">
        <PersonIcon />
      </span>
      <label className="person-main" htmlFor={checkboxId} onClick={(e) => e.stopPropagation()}>
        <bdi className="person-name user-text">{person.displayName}</bdi>
        <span className="person-summary">{summarizePerson(person)}</span>
      </label>
      <Link
        to={`/people/${person.id}`}
        className="person-edit"
        onClick={(e) => e.stopPropagation()}
        aria-label={`עריכה: ${person.displayName}`}
      >
        עריכה
      </Link>
    </div>
  )
}
