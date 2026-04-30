import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import {
  getStudentRib,
  updateStudentRib,
  type StudentRib,
  type UpdateStudentRibPayload,
} from '../lib/api'

const emptyForm: UpdateStudentRibPayload = {
  banque: '',
  iban: '',
  adresse: '',
  telephone: '',
  email: '',
}

function toForm(rib: StudentRib): UpdateStudentRibPayload {
  return {
    banque: rib.banque,
    iban: rib.iban,
    adresse: rib.adresse,
    telephone: rib.telephone,
    email: rib.email,
  }
}

function getRibStatusClass(rib: StudentRib) {
  switch (rib.status) {
    case 'PENDING':
      return 'pending'
    case 'VALIDATED':
      return 'validated'
    case 'REJECTED':
      return 'rejected'
  }
}

export function RibPage() {
  const [rib, setRib] = useState<StudentRib | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateStudentRibPayload>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadRib() {
      try {
        setLoading(true)
        setError(null)
        const nextRib = await getStudentRib()

        if (!ignore) {
          setRib(nextRib)
          setForm(toForm(nextRib))
        }
      } catch (requestError) {
        if (!ignore) {
          setError(
            requestError instanceof Error
              ? requestError
              : new Error('RIB unavailable'),
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadRib()

    return () => {
      ignore = true
    }
  }, [])

  const copyIban = () => {
    if (!rib) {
      return
    }

    navigator.clipboard.writeText(rib.iban.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startEditing = () => {
    if (rib) {
      setForm(toForm(rib))
    }

    setSaveError('')
    setSaveSuccess('')
    setEditing(true)
  }

  const cancelEditing = () => {
    if (rib) {
      setForm(toForm(rib))
    }

    setEditing(false)
    setSaveError('')
  }

  const updateField =
    (field: keyof UpdateStudentRibPayload) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }))
    }

  const saveRib = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const updatedRib = await updateStudentRib(form)

      setRib(updatedRib)
      setForm(toForm(updatedRib))
      setEditing(false)
      setSaveSuccess('Votre RIB a ete soumis et est en attente de validation.')
    } catch {
      setSaveError('Impossible de mettre a jour le RIB')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Coordonnees RIB" />
        <h1>Releve d'Identite Bancaire</h1>
        <p>Coordonnees bancaires enregistrees pour les versements</p>
      </div>

      <InlineState loading={loading} error={error} />

      {rib && (
        <>
          <div className="alert info" style={{ marginBottom: '16px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            <div>
              <span className="alert-title">Informations sensibles</span>
              Les modifications de coordonnees bancaires sont enregistrees sur votre dossier.
            </div>
          </div>

          {saveSuccess && (
            <div className="alert success">
              <span className="alert-title">{saveSuccess}</span>
            </div>
          )}

          <div className="card" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              <div className="info-section-title" style={{ marginBottom: 0, flex: 1 }}>Etablissement Bancaire</div>
              {!editing && (
                <button className="copy-btn" onClick={startEditing}>
                  Modifier mon RIB
                </button>
              )}
            </div>
            <div className="info-grid" style={{ marginBottom: '14px' }}>
              <div className="info-field">
                <label>Nom de la Banque</label>
                <p style={{ fontWeight: 700 }}>{rib.banque}</p>
              </div>
              <div className="info-field">
                <label>BIC</label>
                <p className="mono">{rib.bic}</p>
              </div>
              <div className="info-field">
                <label>Statut</label>
                <p><span className={`status-pill ${getRibStatusClass(rib)}`}>{rib.statusLabel}</span></p>
              </div>
            </div>
            <div className="info-field">
              <label>Numero IBAN</label>
              <div className="iban-display">
                <span>{rib.iban}</span>
                <button className="copy-btn" onClick={copyIban}>
                  {copied ? 'Copie' : 'Copier'}
                </button>
              </div>
            </div>
          </div>

          {editing && (
            <form className="card" onSubmit={saveRib} style={{ marginBottom: '14px' }}>
              <div className="info-section-title">Modifier mon RIB</div>
              <div className="info-grid">
                <label className="info-field">
                  <span>Banque</span>
                  <input value={form.banque} onChange={updateField('banque')} required maxLength={120} />
                </label>
                <label className="info-field">
                  <span>IBAN</span>
                  <input value={form.iban} onChange={updateField('iban')} required maxLength={34} />
                </label>
                <label className="info-field">
                  <span>Adresse</span>
                  <input value={form.adresse} onChange={updateField('adresse')} maxLength={255} />
                </label>
                <label className="info-field">
                  <span>Telephone</span>
                  <input value={form.telephone} onChange={updateField('telephone')} maxLength={30} />
                </label>
                <label className="info-field">
                  <span>Email</span>
                  <input type="email" value={form.email} onChange={updateField('email')} maxLength={120} />
                </label>
              </div>

              {saveError && <p style={{ color: 'var(--red-sn)', fontSize: '13px', marginTop: '12px' }}>{saveError}</p>}

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button className="copy-btn" type="submit" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button className="copy-btn" type="button" onClick={cancelEditing} disabled={saving}>
                  Annuler
                </button>
              </div>
            </form>
          )}

          <div className="card">
            <div className="info-section-title">Coordonnees du Titulaire</div>
            <div className="info-grid">
              <div className="info-field"><label>Titulaire</label><p>{rib.titulaire}</p></div>
              <div className="info-field"><label>Adresse</label><p>{rib.adresse}</p></div>
              <div className="info-field"><label>Telephone</label><p>{rib.telephone}</p></div>
              <div className="info-field"><label>Email</label><p style={{ fontSize: '13.5px' }}>{rib.email}</p></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
