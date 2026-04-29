import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { getStudentDocuments, type StudentDocument } from '../lib/api'
import { useApiResource } from '../lib/useApiResource'

function isMissing(document: StudentDocument) {
  return document.statut === 'MISSING'
}

export function DocumentsPage() {
  const { data, loading, error } = useApiResource(getStudentDocuments)
  const documents = data?.items ?? []

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Documents" />
        <h1>Documents</h1>
        <p>Pieces justificatives de votre dossier</p>
      </div>

      <InlineState loading={loading} error={error} />

      <div style={{ display: 'grid', gap: '10px' }}>
        {documents.map((document, i) => {
          const missing = isMissing(document)

          return (
            <div key={`${document.type}-${i}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8,
                background: missing ? 'oklch(0.97 0.06 80)' : 'var(--green-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: missing ? 'oklch(0.50 0.15 70)' : 'var(--green)',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{document.nom}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                  {document.dateDepot ? `Fourni le ${document.dateDepot}` : 'Document requis'}
                </div>
              </div>
              <span className={`status-pill ${missing ? 'suspendu' : 'actif'}`} style={{ fontSize: '11px' }}>
                {missing ? 'Requis' : 'Fourni'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
