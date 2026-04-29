import { useState } from 'react'
import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { getStudentRib } from '../lib/api'
import { useApiResource } from '../lib/useApiResource'

export function RibPage() {
  const [copied, setCopied] = useState(false)
  const { data: rib, loading, error } = useApiResource(getStudentRib)

  const copyIban = () => {
    if (!rib) {
      return
    }

    navigator.clipboard.writeText(rib.iban.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
              Pour modifier vos coordonnees bancaires, contactez votre gestionnaire de dossier.
            </div>
          </div>

          <div className="card" style={{ marginBottom: '14px' }}>
            <div className="info-section-title">Etablissement Bancaire</div>
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
                <p><span className="status-pill actif">{rib.status}</span></p>
              </div>
            </div>
            <div className="info-field">
              <label>Numero IBAN</label>
              <div className="iban-display">
                <span>{rib.iban}</span>
                <button className="copy-btn" onClick={copyIban}>
                  {copied ? '✓ Copie' : 'Copier'}
                </button>
              </div>
            </div>
          </div>

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
