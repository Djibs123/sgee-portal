import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { InfoItem, InfoList } from '../components/ui/InfoList'
import { StatusPill } from '../components/ui/StatusPill'
import { toneOfStatus } from '../lib/status'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import {
  cancelPendingStudentRib,
  getApiErrorMessage,
  getStudentRib,
  updateStudentRib,
  type StudentRib,
  type StudentRibState,
  type UpdateStudentRibPayload,
} from '../lib/api'

const emptyForm: UpdateStudentRibPayload = {
  banque: '',
  iban: '',
  bic: '',
  adresse: '',
  telephone: '',
  email: '',
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR')

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

/** Pré-remplit les coordonnées de contact, jamais l'IBAN (donnée sensible). */
function toForm(rib: StudentRib | null): UpdateStudentRibPayload {
  return rib
    ? { ...emptyForm, banque: rib.banque, adresse: rib.adresse, telephone: rib.telephone, email: rib.email }
    : emptyForm
}

function withoutEmptyFields(form: UpdateStudentRibPayload): UpdateStudentRibPayload {
  return Object.fromEntries(
    Object.entries(form).filter(([, value]) => typeof value === 'string' && value.trim() !== ''),
  ) as UpdateStudentRibPayload
}

function RibDetails({ rib }: { rib: StudentRib }) {
  return (
    <InfoList>
      <InfoItem label="Banque">{rib.banque}</InfoItem>
      <InfoItem label="Titulaire">{rib.titulaire}</InfoItem>
      <InfoItem label="IBAN" mono>{rib.ibanMasked}</InfoItem>
      <InfoItem label="BIC" mono>{rib.bic}</InfoItem>
      <InfoItem label="Statut">
        <StatusPill tone={toneOfStatus(rib.status)}>{rib.statusLabel}</StatusPill>
      </InfoItem>
      <InfoItem label={rib.status === 'VALIDATED' ? 'Validé le' : 'Soumis le'}>
        {formatDate(rib.status === 'VALIDATED' ? rib.reviewedAt : rib.submittedAt)}
      </InfoItem>
    </InfoList>
  )
}

export function RibPage() {
  useDocumentTitle('Coordonnées bancaires')

  const [state, setState] = useState<StudentRibState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateStudentRibPayload>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let ignore = false

    getStudentRib()
      .then((nextState) => {
        if (!ignore) {
          setState(nextState)
        }
      })
      .catch((requestError: unknown) => {
        if (!ignore) {
          setError(requestError instanceof Error ? requestError : new Error('RIB indisponible'))
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  const startEditing = () => {
    setForm(toForm(state?.pending ?? state?.active ?? null))
    setSaveError('')
    setFeedback('')
    setEditing(true)
  }

  const updateField =
    (field: keyof UpdateStudentRibPayload) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
    }

  const saveRib = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setSaveError('')

    try {
      setState(await updateStudentRib(withoutEmptyFields(form)))
      setEditing(false)
      setFeedback('Votre demande de modification est enregistrée. Votre RIB actuel reste utilisé jusqu’à sa validation.')
    } catch (reason) {
      setSaveError(getApiErrorMessage(reason, 'Impossible d’enregistrer le RIB'))
    } finally {
      setSaving(false)
    }
  }

  const cancelPending = async () => {
    setCancelling(true)

    try {
      setState(await cancelPendingStudentRib())
      setFeedback('Votre demande de modification a été annulée.')
    } catch (reason) {
      setSaveError(getApiErrorMessage(reason, 'Impossible d’annuler la demande'))
    } finally {
      setCancelling(false)
      setConfirmingCancel(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Coordonnées RIB" />
        <h1>Relevé d’identité bancaire</h1>
        <p>Compte sur lequel vos allocations sont versées</p>
      </div>

      <InlineState loading={loading} error={error} />

      {state && (
        <>
          <div className="alert info" style={{ marginBottom: '16px' }}>
            <div>
              <span className="alert-title">Changement de RIB contrôlé</span>
              Toute modification est vérifiée par le SGEE. Vos versements restent effectués sur le RIB actif tant que la nouvelle demande n’est pas validée.
            </div>
          </div>

          <div role="status" aria-live="polite">
            {feedback && (
              <div className="alert success" style={{ marginBottom: '14px' }}>
                <span className="alert-title">{feedback}</span>
              </div>
            )}
          </div>

          {state.lastRejected && !state.pending && (
            <div className="alert warning" style={{ marginBottom: '14px' }}>
              <div>
                <span className="alert-title">Dernière demande refusée</span>
                {state.lastRejected.reviewComment ?? 'Aucun motif précisé.'}
              </div>
            </div>
          )}

          <section className="card" style={{ marginBottom: '14px' }} aria-labelledby="rib-active-title">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              <h2 id="rib-active-title" className="info-section-title" style={{ marginBottom: 0, flex: 1 }}>RIB actif</h2>
              {!editing && (
                <button className="copy-btn" type="button" onClick={startEditing}>
                  {state.pending ? 'Corriger ma demande' : 'Modifier mon RIB'}
                </button>
              )}
            </div>
            {state.active ? <RibDetails rib={state.active} /> : <p>Aucun RIB validé pour le moment.</p>}
          </section>

          {state.pending && (
            <section className="card" style={{ marginBottom: '14px' }} aria-labelledby="rib-pending-title">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                <h2 id="rib-pending-title" className="info-section-title" style={{ marginBottom: 0, flex: 1 }}>Modification en attente</h2>
                <button className="copy-btn" type="button" onClick={() => setConfirmingCancel(true)}>
                  Annuler la demande
                </button>
              </div>
              <RibDetails rib={state.pending} />
            </section>
          )}

          {editing && (
            <form className="card" onSubmit={saveRib} style={{ marginBottom: '14px' }} noValidate>
              <h2 className="info-section-title">Nouveau RIB</h2>
              <div className="info-grid">
                <label className="info-field">
                  <span>Banque</span>
                  <input value={form.banque} onChange={updateField('banque')} required maxLength={120} autoComplete="organization" />
                </label>
                <label className="info-field">
                  <span>IBAN international</span>
                  <input
                    value={form.iban}
                    onChange={updateField('iban')}
                    required
                    maxLength={42}
                    placeholder="FR76 3000 6000 0112 3456 7890 189"
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="iban-help"
                  />
                  <small id="iban-help">IBAN du compte dans votre pays d’études, au nom du boursier.</small>
                </label>
                <label className="info-field">
                  <span>BIC (facultatif)</span>
                  <input value={form.bic} onChange={updateField('bic')} maxLength={11} autoComplete="off" spellCheck={false} />
                </label>
                <label className="info-field">
                  <span>Adresse</span>
                  <input value={form.adresse} onChange={updateField('adresse')} maxLength={255} autoComplete="street-address" />
                </label>
                <label className="info-field">
                  <span>Téléphone</span>
                  <input type="tel" value={form.telephone} onChange={updateField('telephone')} maxLength={30} autoComplete="tel" />
                </label>
                <label className="info-field">
                  <span>E-mail</span>
                  <input type="email" value={form.email} onChange={updateField('email')} maxLength={120} autoComplete="email" />
                </label>
              </div>

              {saveError && (
                <p role="alert" style={{ color: 'var(--red-sn)', fontSize: '13px', marginTop: '12px' }}>{saveError}</p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button className="copy-btn" type="submit" disabled={saving}>
                  {saving ? 'Envoi…' : 'Soumettre pour validation'}
                </button>
                <button className="copy-btn" type="button" onClick={() => setEditing(false)} disabled={saving}>
                  Annuler
                </button>
              </div>
            </form>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirmingCancel}
        title="Annuler la demande de modification ?"
        message="Votre RIB actif reste inchangé. Vous pourrez soumettre une nouvelle demande plus tard."
        confirmLabel="Annuler la demande"
        tone="danger"
        busy={cancelling}
        onConfirm={() => void cancelPending()}
        onCancel={() => setConfirmingCancel(false)}
      />
    </div>
  )
}
