import { NavLink } from 'react-router'

const icons = {
  dashboard: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  profile: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'],
  renewal: ['M21 12a9 9 0 11-3-6.7', 'M21 3v6h-6'],
  cursus: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  payments: ['M12 2v20', 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],
  rib: ['M3 10h18', 'M5 10v8', 'M19 10v8', 'M3 21h18', 'M12 3l9 5H3z'],
  documents: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6'],
  notifications: ['M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 01-3.46 0'],
}

type NavEntry = {
  to: string
  label: string
  icon: keyof typeof icons
  end?: boolean
}

const PORTAL_NAV: NavEntry[] = [
  { to: '/portal', label: 'Tableau de bord', icon: 'dashboard', end: true },
  { to: '/portal/renouvellement', label: 'Renouvellement', icon: 'renewal' },
  { to: '/portal/dossier', label: 'Mon dossier', icon: 'profile' },
  { to: '/portal/cursus', label: 'Cursus académique', icon: 'cursus' },
  { to: '/portal/paiements', label: 'Paiements', icon: 'payments' },
  { to: '/portal/rib', label: 'Coordonnées bancaires', icon: 'rib' },
  { to: '/portal/documents', label: 'Documents', icon: 'documents' },
  { to: '/portal/notifications', label: 'Notifications', icon: 'notifications' },
]

type SidebarProps = {
  open: boolean
  onNavigate: () => void
  onLogout: () => void
  requiredDocumentsCount: number
  unreadNotificationsCount?: number
}

export function Sidebar({
  open,
  onNavigate,
  onLogout,
  requiredDocumentsCount,
  unreadNotificationsCount = 0,
}: SidebarProps) {
  const badgeFor = (entry: NavEntry) => {
    if (entry.icon === 'documents' && requiredDocumentsCount > 0) {
      return { count: requiredDocumentsCount, label: `${requiredDocumentsCount} document(s) à fournir` }
    }

    if (entry.icon === 'notifications' && unreadNotificationsCount > 0) {
      return { count: unreadNotificationsCount, label: `${unreadNotificationsCount} non lue(s)` }
    }

    return null
  }

  return (
    <nav id="portal-sidebar" className={`sidebar${open ? ' open' : ''}`} aria-label="Menu du portail boursier">
      <p className="sidebar-section-label">Menu principal</p>
      <ul className="sidebar-list">
        {PORTAL_NAV.map((entry) => {
          const badge = badgeFor(entry)

          return (
            <li key={entry.to}>
              <NavLink
                to={entry.to}
                end={entry.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={onNavigate}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {icons[entry.icon].map((path) => (
                    <path key={path} d={path} />
                  ))}
                </svg>
                {entry.label}
                {badge && (
                  <span className="nav-badge">
                    <span aria-hidden="true">{badge.count}</span>
                    <span className="sr-only">, {badge.label}</span>
                  </span>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
      <div className="sidebar-bottom">
        <button type="button" className="logout-btn" onClick={onLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Se déconnecter
        </button>
      </div>
    </nav>
  )
}
