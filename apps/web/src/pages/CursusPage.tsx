import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { EmptyState } from '../components/ui/EmptyState'
import { getStudentCursus, type StudentCursus } from '../lib/api'
import { useApiResource } from '../lib/useApiResource'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const RESULT_LABELS: Record<NonNullable<StudentCursus['resultat']>, string> = {
  PASSED: 'Admis',
  REPEATED: 'Redoublement',
  FAILED: 'Ajourné',
}

export function CursusPage() {
  useDocumentTitle('Cursus académique')

  const { data, loading, error } = useApiResource(getStudentCursus)
  const cursus = [...(data?.items ?? [])].reverse()

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Cursus académique" />
        <h1>Parcours académique</h1>
        <p>Historique de vos inscriptions, du plus récent au plus ancien</p>
      </div>

      <InlineState loading={loading} error={error} />

      {data && cursus.length === 0 && <EmptyState title="Aucune inscription enregistrée" />}

      <ol className="cursus-grid">
        {cursus.map((entry) => (
          <li
            key={`${entry.annee}-${entry.niveauLibelle}`}
            className={`cursus-card${entry.actuel ? ' cursus-current' : ''}`}
            aria-current={entry.actuel ? 'step' : undefined}
          >
            <p className="cursus-year-badge">{entry.annee}</p>
            <div className="cursus-info">
              <h2>{entry.specialite}</h2>
              <p>
                {entry.etablissement} – {entry.niveauLibelle}
              </p>
            </div>
            <p className="cursus-status">
              {entry.actuel ? 'En cours' : entry.resultat ? RESULT_LABELS[entry.resultat] : entry.diplome}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
