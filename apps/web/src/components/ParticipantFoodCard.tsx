import { useId } from 'react'
import { dietLabel, FOOD_TYPES } from '../catalogs/foodTypes'
import { FOOD_TEXT_MAX, toggleFoodType, type Person } from '../domain/person'
import { FOOD_MODES, isOutingFoodValid, savedFoodSummary, type FoodMode, type OutingFood } from '../domain/outingFood'
import { MultiChipGroup, SingleChipGroup } from './ChipGroup'
import { PersonIcon } from './icons'

interface Props {
  person: Person
  food: OutingFood
  onChange: (patch: Partial<OutingFood>) => void
}

/** One participant's card on screen 03. */
export function ParticipantFoodCard({ person, food, onChange }: Props) {
  const textId = useId()
  const errorId = useId()
  const invalid = !isOutingFoodValid(food)
  const diet = person.diet !== 'indifferent' ? dietLabel(person.diet) : undefined

  return (
    <section className="card food-card" aria-label={person.displayName}>
      <div className="food-card-head">
        <span className="avatar avatar--small" aria-hidden="true">
          <PersonIcon size={20} />
        </span>
        <bdi className="person-name user-text">{person.displayName}</bdi>
      </div>

      <SingleChipGroup<FoodMode>
        label={`${person.displayName}: מה בא לאכול ביציאה הזו?`}
        options={FOOD_MODES}
        value={food.mode}
        onChange={(mode) => onChange({ mode })}
      />

      {food.mode === 'use_saved' && (
        <div className="readonly-box">
          <span>{savedFoodSummary(person)}</span>
          {person.foodText.trim() && <bdi className="user-text readonly-text">{person.foodText}</bdi>}
        </div>
      )}

      {food.mode === 'specific' && (
        <div className="field-group">
          <MultiChipGroup
            label="סוגי אוכל ליציאה הזו"
            options={FOOD_TYPES}
            selected={food.foodTypes}
            onToggle={(typeId) => onChange({ foodTypes: toggleFoodType(food.foodTypes, typeId) })}
          />
          <textarea
            id={textId}
            className="textarea textarea--short user-text"
            aria-label="מה מתחשק?"
            placeholder="מה מתחשק? תיאור אוכל בלבד"
            maxLength={FOOD_TEXT_MAX}
            value={food.text}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            onChange={(e) => onChange({ text: e.target.value.slice(0, FOOD_TEXT_MAX) })}
          />
          <span className="counter muted small" aria-live="polite">
            {food.text.length}/{FOOD_TEXT_MAX}
          </span>
          {invalid && (
            <p id={errorId} className="field-error" role="alert">
              בחרו לפחות סוג אוכל אחד או כתבו מה מתחשק
            </p>
          )}
        </div>
      )}

      {food.mode === 'indifferent' && <div className="readonly-box">אין העדפת סוג אוכל ליציאה הזו</div>}

      {diet && <p className="muted small">תזונה: {diet}</p>}
    </section>
  )
}
