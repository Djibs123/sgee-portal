import { useId, useState, type FormEvent } from 'react'
import { Dialog } from './Dialog'

type ReasonDialogProps = {
  open: boolean
  title: string
  label: string
  description?: string
  submitLabel: string
  /** Longueur minimale du motif (0 = facultatif). */
  minLength?: number
  busy?: boolean
  onSubmit: (reason: string) => void
  onCancel: () => void
}

/** Saisie d'un motif (refus, complément) : remplace `window.prompt`. */
export function ReasonDialog({
  open,
  title,
  label,
  description,
  submitLabel,
  minLength = 3,
  busy = false,
  onSubmit,
  onCancel,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const fieldId = useId()
  const errorId = useId()

  const close = () => {
    setReason('')
    setError('')
    onCancel()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (reason.trim().length < minLength) {
      setError(`Saisissez au moins ${minLength} caractères.`)
      return
    }

    onSubmit(reason.trim())
    setReason('')
    setError('')
  }

  return (
    <Dialog open={open} title={title} description={description} onClose={close}>
      <form onSubmit={submit} noValidate>
        <label className="field" htmlFor={fieldId}>
          <span>{label}</span>
          <textarea
            id={fieldId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={1000}
            required={minLength > 0}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </label>
        {error && (
          <p id={errorId} className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Envoi…' : submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
