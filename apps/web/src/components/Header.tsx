import type { StudentProfile } from '../lib/api'

type HeaderProps = {
  student: StudentProfile
}

export function Header({ student }: HeaderProps) {
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase()
  const displayName = `${student.firstName.toUpperCase()} ${student.lastName.charAt(0).toUpperCase()}.`

  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <div className="header-logo-text">
          <strong>Republique du Senegal</strong>
          <span>Bourse &amp; Aide a l'Enseignement Superieur</span>
        </div>
      </div>

      <div className="header-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input type="search" placeholder="Rechercher..." />
      </div>

      <div className="header-actions">
        <div className="secure-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Session securisee
        </div>
        <button className="btn-infoline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
          <span>01 71 25 00 61</span>
        </button>
        <div className="header-user">
          <div className="avatar">{initials}</div>
          <span>{displayName}</span>
        </div>
      </div>
    </header>
  )
}
