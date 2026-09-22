import { useCallback, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { InlineState } from '../../components/InlineState'
import { TextField } from '../../components/ui/fields'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { StatusPill } from '../../components/ui/StatusPill'
import { listAdminStudents } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { SCHOLARSHIP_STATUS_LABELS } from '../../lib/scholarshipLabels'
import { toneOfStatus } from '../../lib/status'
import { useApiResource } from '../../lib/useApiResource'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

const PAGE_SIZE = 25

/** Annuaire des boursiers (sans données sensibles : ni mot de passe, ni IBAN). */
export function AdminStudentsPage() {
  useDocumentTitle('Étudiants')

  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const load = useCallback(() => listAdminStudents({ search, page, pageSize: PAGE_SIZE }), [search, page])
  const { data, loading, error } = useApiResource(load)
  const [draft, setDraft] = useState(search)

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearchParams(draft.trim() ? { search: draft.trim() } : {})
  }

  const goToPage = (next: number) => setSearchParams({ ...(search ? { search } : {}), page: String(next) })

  return (
    <div>
      <div className="admin-page-title">
        <h1>Étudiants</h1>
        <p>Recherche par nom, e-mail, numéro boursier ou matricule.</p>
      </div>

      <form className="admin-card admin-filters" role="search" onSubmit={apply}>
        <div className="admin-filters-actions">
          <TextField name="search" label="Rechercher un étudiant" value={draft} onChange={setDraft} maxLength={100} />
          <button type="submit" className="btn btn-primary">
            Rechercher
          </button>
        </div>
      </form>

      <InlineState loading={loading && !data} error={data ? null : error} />
      {data && data.items.length === 0 && <EmptyState title="Aucun étudiant" description="Aucun étudiant ne correspond à cette recherche." />}

      {data && data.items.length > 0 && (
        <section className="admin-card">
          <div className="table-wrapper">
            <table className="data-table">
              <caption>{data.total} étudiant(s)</caption>
              <thead>
                <tr>
                  <th scope="col">Numéro</th>
                  <th scope="col">Nom</th>
                  <th scope="col">Formation</th>
                  <th scope="col">Bourse</th>
                  <th scope="col">Dernière connexion</th>
                  <th scope="col">Demandes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((student) => (
                  <tr key={student.id}>
                    <th scope="row">{student.code}</th>
                    <td>
                      {student.firstName} {student.lastName}
                      <br />
                      <small>{student.email}</small>
                    </td>
                    <td>
                      {[student.level, student.field].filter(Boolean).join(' – ') || '—'}
                      {student.academicYear && (
                        <>
                          <br />
                          <small>{student.academicYear}</small>
                        </>
                      )}
                    </td>
                    <td>
                      <StatusPill tone={toneOfStatus(student.scholarshipStatus)}>
                        {SCHOLARSHIP_STATUS_LABELS[student.scholarshipStatus] ?? student.scholarshipStatus}
                      </StatusPill>
                    </td>
                    <td>{student.lastLoginAt ? formatDateTime(student.lastLoginAt) : 'Jamais'}</td>
                    <td>
                      <Link
                        to={`/admin/demandes?search=${encodeURIComponent(student.code)}`}
                        aria-label={`Voir les demandes de ${student.firstName} ${student.lastName}`}
                      >
                        Voir les demandes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={goToPage} label="Pages d’étudiants" />
        </section>
      )}
    </div>
  )
}
