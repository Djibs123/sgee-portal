import { Link } from 'react-router'
import { InlineState } from '../../components/InlineState'
import { getAdminPendingDocuments, getAdminPendingRibs, listAdminRequests } from '../../lib/api'
import { useApiResource } from '../../lib/useApiResource'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useAdminSession } from '../../session/sessions'

const count = (status: string) => listAdminRequests({ status, pageSize: 1 }).then((page) => page.total)

/** Compteurs de travail : un seul appel léger par file (`pageSize=1`, seul `total` est lu). */
const loadOverview = async () => {
  const [submitted, underReview, incomplete, documents, ribs] = await Promise.all([
    count('SUBMITTED'),
    count('UNDER_REVIEW'),
    count('INCOMPLETE'),
    getAdminPendingDocuments().then((response) => response.items.length),
    getAdminPendingRibs(1, 1).then((response) => response.total),
  ])

  return { submitted, underReview, incomplete, documents, ribs }
}

export function AdminOverviewPage() {
  useDocumentTitle('Administration')

  const { profile } = useAdminSession()
  const { data, loading, error } = useApiResource(loadOverview)
  const tiles = data
    ? [
        { label: 'Demandes à prendre en charge', value: data.submitted, to: '/admin/demandes?status=SUBMITTED' },
        { label: 'Demandes en cours d’instruction', value: data.underReview, to: '/admin/demandes?status=UNDER_REVIEW' },
        { label: 'Compléments attendus', value: data.incomplete, to: '/admin/demandes?status=INCOMPLETE' },
        { label: 'Documents à valider', value: data.documents, to: '/admin/validations' },
        { label: 'RIB à valider', value: data.ribs, to: '/admin/validations' },
      ]
    : []

  return (
    <div>
      <div className="admin-page-title">
        <h1>Tableau de bord</h1>
        <p>Bonjour {profile?.name}, voici le travail en attente.</p>
      </div>
      <InlineState loading={loading} error={error} />
      <ul className="admin-tiles">
        {tiles.map((tile) => (
          <li key={tile.label} className="admin-card">
            <Link to={tile.to}>
              <strong>{tile.value}</strong>
              <span>{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
