import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}

/** Small confirmation window styled like the app (not a separate screen). */
export function ConfirmDialog({ open, title, confirmLabel, cancelLabel, onConfirm, onCancel, busy }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
    >
      <p id="confirm-title" className="dialog-title">
        {title}
      </p>
      <div className="dialog-actions">
        <button type="button" className="btn btn--primary" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
      </div>
    </dialog>
  )
}
