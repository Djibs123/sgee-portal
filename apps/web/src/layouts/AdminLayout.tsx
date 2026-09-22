import { Navigate, Outlet, useLocation } from 'react-router'
import { useAdminSession } from '../session/sessions'
import { FullPageMessage } from './FullPageMessage'

/** Back-office : accès réservé aux sessions admin valides. */
export function AdminLayout() {
  const { profile, status, expired } = useAdminSession()
  const location = useLocation()

  if (status === 'loading') {
    return <FullPageMessage>Vérification de la session admin…</FullPageMessage>
  }

  if (!profile) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname, expired }} />
  }

  return <Outlet />
}
