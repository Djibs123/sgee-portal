import type { PageId } from '../types'

const icons: Record<string, string> = {
  dashboard: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  profile: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z',
  cursus: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  payments: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  rib: 'M3 6h18M3 12h18M3 18h18 M3 3l18 18',
  documents: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6',
}

type NavItemProps = {
  label: string
  iconPath: string
  active: boolean
  badge?: string
  onClick: () => void
}

function NavItem({ label, iconPath, active, badge, onClick }: NavItemProps) {
  const paths = iconPath.split(' M')
  return (
    <button
      type="button"
      className={`nav-item${active ? ' active' : ''}`}
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths.map((p, i) => (
          <path key={i} d={i === 0 ? p : 'M' + p} />
        ))}
      </svg>
      {label}
      {badge && <span className="nav-badge">{badge}</span>}
    </button>
  )
}

type SidebarProps = {
  active: PageId
  onNav: (page: PageId) => void
  onLogout: () => void
}

const nav: { id: PageId; label: string; icon: string; badge?: string }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: icons.dashboard },
  { id: 'general', label: 'Mon Dossier', icon: icons.profile },
  { id: 'cursus', label: 'Cursus Academique', icon: icons.cursus },
  { id: 'paiements', label: 'Paiements', icon: icons.payments },
  { id: 'rib', label: 'Coordonnees RIB', icon: icons.rib },
  { id: 'documents', label: 'Documents', icon: icons.documents, badge: '2' },
]

export function Sidebar({ active, onNav, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">Menu principal</div>
      {nav.map((n) => (
        <NavItem
          key={n.id}
          label={n.label}
          iconPath={n.icon}
          active={active === n.id}
          badge={n.badge}
          onClick={() => onNav(n.id)}
        />
      ))}
      <div className="sidebar-bottom">
        <button className="logout-btn" onClick={onLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Deconnexion
        </button>
      </div>
    </aside>
  )
}
