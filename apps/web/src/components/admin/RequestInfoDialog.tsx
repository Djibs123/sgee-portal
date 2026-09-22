import { useId, useState, type FormEvent } from 'react'
import type { RequestDocumentView } from '../../lib/api'
import { Dialog } from '../ui/Dialog'

type RequestInfoDialogProps = {
  open: boolean
  documents: RequestDocumentView[]
  busy?: boolean
  onSubmit: (comment: string, documentTypeCodes: string[]) => void
  onCancel: () => void
}

/** Demande de complément : motif communiqué au demandeur et pièces à redéposer. */
export function RequestInfoDialog({ open, documents, busy = false, onSubmit, onCancel }: RequestInfoDialogProps) {
  const [comment, setComment] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')
  const fieldId = useId()
  const errorId = useId()
  const uploaded = documents.filter((document) => document.isDownloadable)

  const close = () => {
    setComment('')
    setSelected([])
    setError('')
    onCancel()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (comment.trim().length < 3) {
      setError('Saisissez au moins 3 caractères.')
      return
    }

    onSubmit(comment.trim(), selected)
    setComment('')
    setSelected([])
    setError('')
  }

  const toggle = (code: string, checked: boolean) =>
    setSelected((current) => (checked ? [...current, code] : current.filter((item) => item !== code)))

  return (
    <Dialog
      open={open}
      title="Demander un complément"
      description="Le demandeur est notifié et peut modifier sa demande puis la renvoyer."
      onClose={close}
    >
      <form onSubmit={submit} noValidate className="form-stack">
        <div className="field">
          <label htmlFor={fieldId}>Motif communiqué au demandeur</label>
          <textarea
            id={fieldId}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            maxLength={500}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          {error && (
            <p id={errorId} className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
        {uploaded.length > 0 && (
          <fieldset className="radio-group">
            <legend>Pièces à redéposer (facultatif)</legend>
            {uploaded.map((document) => (
              <label key={document.documentTypeCode}>
                <input
                  type="checkbox"
                  checked={selected.includes(document.documentTypeCode)}
                  onChange={(event) => toggle(document.documentTypeCode, event.target.checked)}
                />
                {document.label}
              </label>
            ))}
          </fieldset>
        )}
        <div className="dialog-footer">
          <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Envoi…' : 'Demander le complément'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
