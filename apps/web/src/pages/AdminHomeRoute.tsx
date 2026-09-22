import { useNavigate } from 'react-router'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useAdminSession } from '../session/sessions'
import { AdminDashboardPage } from './AdminDashboardPage'

/** Accueil du back-office ; la mise en page complète arrive avec le lot back-office. */
export function AdminHomeRoute() {
  useDocumentTitle('Administration')

  const { profile, signOut } = useAdminSession()
  const navigate = useNavigate()

  if (!profile) {
    return null
  }

  const logout = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return <AdminDashboardPage admin={profile} onLogout={() => void logout()} />
}
