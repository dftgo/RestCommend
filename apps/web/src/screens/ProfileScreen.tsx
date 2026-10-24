import { useEffect, useId, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { personsRepository } from '../db'
import { DuplicateNameError, EmptyNameError } from '../db/personsRepository'
import { DIETS, FOOD_TYPES, INDIFFERENT_LABEL, type Diet } from '../catalogs/foodTypes'
import { draftOf, EMPTY_DRAFT, FOOD_TEXT_MAX, isNameEmpty, toggleFoodType, type PersonDraft } from '../domain/person'
import { useOuting } from '../state/OutingContext'
import { ScreenHeader } from '../components/ScreenHeader'
import { MultiChipGroup, SingleChipGroup } from '../components/ChipGroup'
import { ConfirmDialog } from '../components/ConfirmDialog'

type NameError = 'empty' | 'duplicate' | null

/** Screen 02 — "פרופיל סועד" (create at /people/new, edit at /people/:id). */
export function ProfileScreen() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { remove: removeFromOuting } = useOuting()
  const nameId = useId()
  const textId = useId()

  const [draft, setDraft] = useState<PersonDraft>(EMPTY_DRAFT)
  const [savedName, setSavedName] = useState('')
  const [loaded, setLoaded] = useState(!isEdit)
  const [nameError, setNameError] = useState<NameError>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Load the stored profile for editing; unknown ids go back to screen 01.
  useEffect(() => {
    if (!id) return
    let active = true
    personsRepository.get(id).then(
      (p) => {
        if (!active) return
        if (!p) {
          navigate('/', { replace: true })
          return
        }
        setDraft(draftOf(p))
        setSavedName(p.displayName)
        setLoaded(true)
      },
      () => active && navigate('/', { replace: true }),
    )
    return () => {
      active = false
    }
  }, [id, navigate])

  const update = (patch: Partial<PersonDraft>) => setDraft((d) => ({ ...d, ...patch }))

  async function save() {
    setSaveFailed(false)
    if (isNameEmpty(draft.displayName)) {
      setNameError('empty')
      return
    }
    setBusy(true)
    try {
      if (id) await personsRepository.update(id, draft)
      else await personsRepository.create(draft)
      navigate('/')
    } catch (e) {
      if (e instanceof DuplicateNameError) setNameError('duplicate')
      else if (e instanceof EmptyNameError) setNameError('empty')
      else setSaveFailed(true)
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!id) return
    setBusy(true)
    try {
      await personsRepository.remove(id)
      removeFromOuting(id)
      navigate('/')
    } catch {
      setConfirmOpen(false)
      setSaveFailed(true)
      setBusy(false)
    }
  }

  if (!loaded) return <main className="screen" />

  return (
    <main className="screen">
      <ScreenHeader title="פרופיל סועד" />

      <form
        className="stack"
        style={{ gap: 'var(--space-3)' }}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
        noValidate
      >
        <div className="field-group">
          <label className="label" htmlFor={nameId}>
            שם
          </label>
          <input
            id={nameId}
            className="input user-text"
            value={draft.displayName}
            autoComplete="off"
            aria-invalid={nameError !== null}
            aria-describedby={nameError ? `${nameId}-error` : undefined}
            onChange={(e) => {
              update({ displayName: e.target.value })
              setNameError(null)
            }}
          />
          {nameError && (
            <p id={`${nameId}-error`} className="field-error" role="alert">
              {nameError === 'empty' ? 'יש להזין שם' : 'כבר יש פרופיל בשם הזה'}
            </p>
          )}
        </div>

        <section className="field-group">
          <h2 className="section-title">העדפות אוכל כלליות</h2>
          <p className="muted small">אפשר לבחור כמה אפשרויות</p>
          <MultiChipGroup
            label="סוגי אוכל"
            options={FOOD_TYPES}
            selected={draft.foodTypes}
            onToggle={(typeId) => update({ foodTypes: toggleFoodType(draft.foodTypes, typeId) })}
            indifferent={{ label: INDIFFERENT_LABEL, onSelect: () => update({ foodTypes: [] }) }}
          />
        </section>

        <div className="field-group">
          <label className="label" htmlFor={textId}>
            משהו נוסף שאוהבים?
          </label>
          <textarea
            id={textId}
            className="textarea user-text"
            placeholder="טקסט חופשי · לא חובה"
            maxLength={FOOD_TEXT_MAX}
            value={draft.foodText}
            onChange={(e) => update({ foodText: e.target.value.slice(0, FOOD_TEXT_MAX) })}
          />
          <span className="counter muted small" aria-live="polite">
            {draft.foodText.length}/{FOOD_TEXT_MAX}
          </span>
        </div>

        <section className="field-group">
          <h2 className="section-title">העדפות תזונה</h2>
          <SingleChipGroup<Diet>
            label="העדפות תזונה"
            options={DIETS}
            value={draft.diet}
            onChange={(diet) => update({ diet })}
          />
        </section>

        <p className="muted small">הפרופיל נשמר במכשיר הזה</p>

        {saveFailed && (
          <p className="notice" role="alert">
            השמירה נכשלה. נסו שוב.
          </p>
        )}

        <div className="field-group">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            שמירת פרופיל
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/')} disabled={busy}>
            ביטול וחזרה
          </button>
        </div>
      </form>

      {isEdit && (
        <div className="danger-zone">
          <button type="button" className="btn-text" onClick={() => setConfirmOpen(true)} disabled={busy}>
            מחיקת פרופיל
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={
          <>
            למחוק את הפרופיל של <bdi>{savedName}</bdi>?
          </>
        }
        confirmLabel="מחיקה"
        cancelLabel="ביטול"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmOpen(false)}
        busy={busy}
      />
    </main>
  )
}
