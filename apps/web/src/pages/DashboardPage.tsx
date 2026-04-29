import { Breadcrumb } from '../components/Breadcrumb'
import {
  getStudentDocuments,
  getStudentPayments,
  getStudentProfile,
  type StudentDocument,
  type StudentPayment,
  type StudentProfile,
} from '../lib/api'
import { InlineState } from '../components/InlineState'
import { useApiResource } from '../lib/useApiResource'
import type { PageId } from '../types'

type DashboardPageProps = {
  onNav: (page: PageId) => void
}

type DashboardData = {
  profile: StudentProfile
  payments: StudentPayment[]
  documents: StudentDocument[]
}

async function getDashboardData(): Promise<DashboardData> {
  const [profile, payments, documents] = await Promise.all([
    getStudentProfile(),
    getStudentPayments(),
    getStudentDocuments(),
  ])

  return {
    profile,
    payments: payments.items,
    documents: documents.items,
  }
}

function getInitials(profile: StudentProfile) {
  return `${profile.prenom.charAt(0)}${profile.nom.charAt(0)}`.toUpperCase()
}

export function DashboardPage({ onNav }: DashboardPageProps) {
  const { data, loading, error } = useApiResource(getDashboardData)
  const profile = data?.profile
  const recent = data?.payments.slice(0, 4) ?? []
  const missingDocuments =
    data?.documents.filter((document) => document.statut === 'MISSING').length ?? 0

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Tableau de bord" />
        <h1>Bonjour, {profile?.prenom ?? 'Etudiant'}</h1>
        <p>Voici l'etat de votre dossier de bourse - annee scolaire {profile?.anneeScolaire ?? '...'}</p>
      </div>

      <InlineState loading={loading} error={error} />

      {profile && (
        <>
          <div className="student-card">
            <div className="student-card-top">
              <div className="student-avatar-lg">{getInitials(profile)}</div>
              <div>
                <div className="student-name">{profile.nom} {profile.prenom}</div>
                <div className="student-meta">N Etudiant : {profile.codeEtudiant} - Matricule : {profile.matricule}</div>
                <div className="student-meta" style={{ marginTop: '4px' }}>{profile.academie}, {profile.pays} - {profile.filiere} - {profile.niveau}</div>
              </div>
            </div>
            <div className="student-chips">
              <div className="chip status-active">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Bourse active
              </div>
              <div className="chip">{profile.typeBourse}</div>
              <div className="chip">{profile.modePaiement}</div>
              <div className="chip">Annee {profile.anneeScolaire}</div>
            </div>
          </div>

          <div className="stat-grid">
            <div className="card stat-card">
              <div className="stat-icon green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div className="stat-label">Allocation mensuelle</div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>{profile.allocationBase}</div>
              <div className="stat-sub">{profile.allocationMensuelle}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon yellow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="stat-label">Prochain versement</div>
              <div className="stat-value">Mai 2026</div>
              <div className="stat-sub">Dernier traitement: {profile.dernierTraitement}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="stat-label">Total verse (2025/26)</div>
              <div className="stat-value">{profile.totalVerse}</div>
              <div className="stat-sub">{data?.payments.length ?? 0} versements effectues</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-title">Progression de la bourse</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-2)' }}>Debut : {profile.dateDebut}</span>
              <span style={{ fontWeight: 600 }}>~{profile.progression}% complete</span>
              <span style={{ color: 'var(--text-2)' }}>Fin : {profile.dateFin}</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${profile.progression}%` }}></div></div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-3)' }}>Attribution N {profile.numAttribution} - Date d'arrivee: {profile.dateArrivee}</div>
          </div>

          <div className="dash-grid">
            <div>
              <div className="card">
                <div className="card-title">Alertes &amp; Notifications</div>
                <div className="alert success">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
                  </svg>
                  <div><span className="alert-title">Versement d'avril effectue</span>297,27 EUR verses le 01/04/2026</div>
                </div>
                <div className="alert info">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <div><span className="alert-title">Renouvellement 2026/2027</span>Pensez a soumettre votre dossier avant le 30 juin 2026</div>
                </div>
                <div className="alert warning">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div><span className="alert-title">{missingDocuments} documents en attente</span>Releve de notes S5 et certificat de scolarite</div>
                </div>
              </div>
            </div>

            <div>
              <div className="card">
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Derniers paiements
                  <button onClick={() => onNav('paiements')} style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--green)', cursor: 'pointer', background: 'none', border: 'none' }}>
                    Voir tout →
                  </button>
                </div>
                {recent.map((p, i) => (
                  <div key={i} className="recent-payment-row">
                    <div className="rpm-left">
                      <div className="payment-dot" style={{ marginTop: '5px' }}></div>
                      <div>
                        <div className="rpm-month">
                          {p.mois}{' '}
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 400 }}>{p.annee}</span>
                        </div>
                        <div className="rpm-date">{p.date}</div>
                      </div>
                    </div>
                    <div className="rpm-amount">{p.montant}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
