type PublicHeaderProps = {
  onNavigate: (path: string) => void
}

export function PublicHeader({ onNavigate }: PublicHeaderProps) {
  const openPortal = () => onNavigate('/portal')

  return (
    <>
      <div className="public-topbar">
        <div className="public-container public-topbar-inner">
          <span>Republique du Senegal</span>
          <a href="tel:0033171250061">Infoline: 0033 171 250 061</a>
        </div>
      </div>
      <header className="public-header">
        <div className="public-container public-header-inner">
          <a className="public-brand" href="#accueil">
            <span className="public-brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </span>
            <span>
              <strong>SGEE</strong>
              <small>Service de Gestion des Etudiants a l'Etranger</small>
            </span>
          </a>
          <nav className="public-nav" aria-label="Navigation publique">
            <a href="#services">Services</a>
            <a href="#actualites">Actualites</a>
            <a href="#demarches">Demarches</a>
            <a href="#faq">FAQ</a>
          </nav>
          <button className="public-login-btn" type="button" onClick={openPortal}>
            Acceder a mon compte
          </button>
        </div>
      </header>
    </>
  )
}
