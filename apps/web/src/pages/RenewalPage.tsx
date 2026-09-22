import { Breadcrumb } from '../components/Breadcrumb'
import { RequestWorkspace } from '../components/requests/RequestWorkspace'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function RenewalPage() {
  useDocumentTitle('Renouvellement')

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Renouvellement" />
        <h1>Renouvellement de la bourse</h1>
        <p>Chaque année, du 1er septembre au 31 décembre, confirmez votre inscription et vos résultats.</p>
      </div>
      <RequestWorkspace space="student" startLabel="Commencer mon renouvellement" />
    </div>
  )
}
