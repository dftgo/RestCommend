import { CheckIcon } from './icons'

export interface ChipOption {
  id: string
  label: string
}

interface ChipProps {
  label: string
  selected: boolean
  onClick: () => void
  role?: 'radio'
  disabled?: boolean
}

function Chip({ label, selected, onClick, role, disabled }: ChipProps) {
  const stateProps = role === 'radio' ? { role, 'aria-checked': selected } : { 'aria-pressed': selected }
  return (
    <button type="button" className="chip" onClick={onClick} disabled={disabled} {...stateProps}>
      {selected && <CheckIcon className="chip-check" />}
      <span>{label}</span>
    </button>
  )
}

interface MultiProps {
  label: string
  options: ChipOption[]
  selected: string[]
  onToggle: (id: string) => void
  /** Exclusive "doesn't matter" chip; selected when nothing else is. */
  indifferent?: { label: string; onSelect: () => void }
  /** When this many are selected, the other chips are disabled. */
  max?: number
}

/** Multi-select chips with an optional exclusive "doesn't matter" option. */
export function MultiChipGroup({ label, options, selected, onToggle, indifferent, max }: MultiProps) {
  const full = max !== undefined && selected.length >= max
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const isOn = selected.includes(o.id)
        return (
          <Chip key={o.id} label={o.label} selected={isOn} disabled={full && !isOn} onClick={() => onToggle(o.id)} />
        )
      })}
      {indifferent && (
        <Chip label={indifferent.label} selected={selected.length === 0} onClick={indifferent.onSelect} />
      )}
    </div>
  )
}

interface SingleProps<T extends string> {
  label: string
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

/** Single-select chips (radio group). */
export function SingleChipGroup<T extends string>({ label, options, value, onChange }: SingleProps<T>) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <Chip key={o.id} role="radio" label={o.label} selected={value === o.id} onClick={() => onChange(o.id)} />
      ))}
    </div>
  )
}
