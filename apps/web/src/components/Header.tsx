import type { StudentProfile } from '../lib/api'

type HeaderProps = {
  student: StudentProfile
  menuOpen: boolean
  onToggleMenu: () => void
}

export function Header({ student, menuOpen, onToggleMenu }: HeaderProps) {
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase()

  return (
    <header className="header">
      <button
        type="button"
        className="menu-toggle"
        aria-controls="portal-sidebar"
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        <span className="sr-only">{menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
      </button>

      <div className="header-logo">
        <div className="header-logo-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <div className="header-logo-text">
          <strong>République du Sénégal</strong>
          <span>Bourses des étudiants sénégalais à l’étranger</span>
        </div>
      </div>

      <div className="header-actions">
        <a className="btn-infoline" href="tel:+33171250061">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
          <span>01 71 25 00 61</span>
          <span className="sr-only"> (infoline SGEE)</span>
        </a>
        <div className="header-user">
          <div className="avatar" aria-hidden="true">{initials}</div>
          <span>{student.firstName} {student.lastName.charAt(0).toUpperCase()}.</span>
        </div>
      </div>
    </header>
  )
}
