import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import type { AdminRole } from '../types'
import { useAdminSession } from '../session/sessions'
import { FullPageMessage } from './FullPageMessage'
import { SkipLink } from './SkipLink'

const ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: 'Instructeur',
  SUPER_ADMIN: 'Super-administrateur',
}

const NAVIGATION: Array<{ to: string; label: string; end?: boolean; superAdminOnly?: boolean }> = [
  { to: '/admin', label: 'Tableau de bord', end: true },
  { to: '/admin/demandes', label: 'Demandes' },
  { to: '/admin/validations', label: 'Documents et RIB' },
  { to: '/admin/etudiants', label: 'Étudiants' },
  { to: '/admin/campagnes', label: 'Campagnes' },
  { to: '/admin/journal', label: 'Journal d’audit', superAdminOnly: true },
]

/** Back-office : accès réservé aux sessions admin valides, menu adapté au rôle. */
export function AdminLayout() {
  const { profile, status, expired, signOut } = useAdminSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  if (status === 'loading') {
    return <FullPageMessage>Vérification de la session admin…</FullPageMessage>
  }

  if (!profile) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname, expired }} />
  }

  const leave = async () => {
    setLeaving(true)

    try {
      await signOut()
    } finally {
      navigate('/admin/login', { replace: true })
    }
  }

  return (
    <>
      <SkipLink />
      <div className="flag-strip" aria-hidden="true"><span /><span /><span /></div>
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <strong>Administration SGEE</strong>
            <span>Instruction des dossiers de bourse</span>
          </div>
          <div className="admin-header-actions">
            <span>
              {profile.name} – {ROLE_LABELS[profile.role]}
            </span>
            <button type="button" disabled={leaving} onClick={() => void leave()}>
              Se déconnecter
            </button>
          </div>
        </header>
        <nav className="admin-nav" aria-label="Back-office">
          <ul>
            {NAVIGATION.filter((item) => !item.superAdminOnly || profile.role === 'SUPER_ADMIN').map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="admin-main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </>
  )
}
