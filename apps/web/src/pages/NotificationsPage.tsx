import { Breadcrumb } from '../components/Breadcrumb'
import { NotificationsPanel } from '../components/NotificationsPanel'
import { usePortalContext } from '../layouts/usePortalContext'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function NotificationsPage() {
  useDocumentTitle('Notifications')

  const { setUnreadNotificationsCount } = usePortalContext()

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Notifications" />
        <h1>Notifications</h1>
        <p>Suivi de vos demandes, documents et coordonnées bancaires</p>
      </div>
      <NotificationsPanel space="student" onUnreadCountChange={setUnreadNotificationsCount} />
    </div>
  )
}
