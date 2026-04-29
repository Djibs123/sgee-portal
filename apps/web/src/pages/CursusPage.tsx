import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { getStudentCursus } from '../lib/api'
import { useApiResource } from '../lib/useApiResource'

export function CursusPage() {
  const { data, loading, error } = useApiResource(getStudentCursus)
  const cursus = data?.items ?? []

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Cursus Academique" />
        <h1>Parcours Academique</h1>
        <p>Historique de vos inscriptions et diplomes</p>
      </div>

      <InlineState loading={loading} error={error} />

      <div className="cursus-grid">
        {[...cursus].reverse().map((c, i) => (
          <div key={`${c.annee}-${i}`} className={`cursus-card${c.actuel ? ' cursus-current' : ''}`}>
            <div className="cursus-year-badge">{c.annee.replace('/', '\n')}</div>
            <div className="cursus-info">
              <h3>{c.specialite}</h3>
              <p>{c.etablissement} - {c.niveau}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <span className="cursus-badge">{c.diplome}</span>
              {c.actuel && <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>En cours ✓</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
