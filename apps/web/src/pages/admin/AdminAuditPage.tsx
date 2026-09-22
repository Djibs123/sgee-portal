import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { InlineState } from '../../components/InlineState'
import { SelectField } from '../../components/ui/fields'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { listAuditLogs } from '../../lib/api'
import { AUDIT_ACTION_LABELS, AUDIT_ACTOR_LABELS } from '../../lib/auditLabels'
import { formatDateTime } from '../../lib/format'
import { useApiResource } from '../../lib/useApiResource'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useAdminSession } from '../../session/sessions'

const PAGE_SIZE = 50

/** Journal d'audit en ajout seul (SUPER_ADMIN) : qui a fait quoi, sur quoi, quand et d'où. */
export function AdminAuditPage() {
  useDocumentTitle('Journal d’audit')

  const { profile } = useAdminSession()

  if (profile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="admin-page-title">
        <h1>Journal d’audit</h1>
        <p>Accès réservé aux super-administrateurs.</p>
      </div>
    )
  }

  return <AuditLog />
}

function AuditLog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const action = searchParams.get('action') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const load = useCallback(() => listAuditLogs({ action, page, pageSize: PAGE_SIZE }), [action, page])
  const { data, loading, error } = useApiResource(load)

  const update = (next: { action?: string; page?: number }) => {
    const params = new URLSearchParams()
    const nextAction = next.action ?? action

    if (nextAction) {
      params.set('action', nextAction)
    }

    if (next.page && next.page > 1) {
      params.set('page', String(next.page))
    }

    setSearchParams(params)
  }

  return (
    <div>
      <div className="admin-page-title">
        <h1>Journal d’audit</h1>
        <p>Connexions, décisions, consultations d’IBAN et paramétrage, du plus récent au plus ancien.</p>
      </div>

      <div className="admin-card admin-filters">
        <SelectField name="action" label="Action" emptyLabel="Toutes" value={action} onChange={(value) => update({ action: value })}>
          {Object.entries(AUDIT_ACTION_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>

      <InlineState loading={loading && !data} error={data ? null : error} />
      {data && data.items.length === 0 && <EmptyState title="Aucune entrée" />}

      {data && data.items.length > 0 && (
        <section className="admin-card">
          <div className="table-wrapper">
            <table className="data-table">
              <caption>{data.total} entrée(s)</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Action</th>
                  <th scope="col">Auteur</th>
                  <th scope="col">Objet</th>
                  <th scope="col">Adresse IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id}>
                    <th scope="row">{formatDateTime(entry.createdAt)}</th>
                    <td>{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</td>
                    <td>
                      {AUDIT_ACTOR_LABELS[entry.actorType] ?? entry.actorType}
                      {entry.actorId && (
                        <>
                          <br />
                          <small className="mono">{entry.actorId.slice(0, 8)}</small>
                        </>
                      )}
                    </td>
                    <td>
                      {entry.entityType}
                      {entry.entityId && (
                        <>
                          <br />
                          <small className="mono">{entry.entityId.slice(0, 8)}</small>
                        </>
                      )}
                    </td>
                    <td className="mono">{entry.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(next) => update({ page: next })} label="Pages du journal" />
        </section>
      )}
    </div>
  )
}
