import { useState, type FormEvent } from 'react'
import { createAcademicYear, getApiErrorMessage } from '../../lib/api'
import { Dialog } from '../ui/Dialog'
import { CheckboxField, TextField } from '../ui/fields'
import { StatusMessage } from '../ui/StatusMessage'

type AcademicYearDialogProps = {
  open: boolean
  onSaved: (message: string) => void
  onCancel: () => void
}

/** Nouvelle année universitaire (SUPER_ADMIN) ; « année en cours » bascule les campagnes publiques. */
export function AcademicYearDialog({ open, onSaved, onCancel }: AcademicYearDialogProps) {
  const [code, setCode] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [isCurrent, setIsCurrent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await createAcademicYear({ code: code.trim(), startsOn, endsOn, isCurrent })
      onSaved(`Année ${code.trim()} créée.`)
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Création impossible.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} title="Nouvelle année universitaire" onClose={onCancel}>
      <form className="form-stack" onSubmit={submit}>
        <TextField name="code" label="Code" required value={code} onChange={setCode} hint="Format 2027-2028" maxLength={9} />
        <TextField name="startsOn" label="Début" type="date" required value={startsOn} onChange={setStartsOn} />
        <TextField name="endsOn" label="Fin" type="date" required value={endsOn} onChange={setEndsOn} />
        <CheckboxField name="isCurrent" label="Année en cours (affichée sur l’accueil)" checked={isCurrent} onChange={setIsCurrent} />
        <StatusMessage tone="error" message={error} />
        <div className="dialog-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Créer'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
