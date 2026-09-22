import { Link } from 'react-router'

export function PublicHeader() {
  return (
    <>
      <div className="public-topbar">
        <div className="public-container public-topbar-inner">
          <span>République du Sénégal</span>
          <a href="tel:+33171250061">Infoline : 01 71 25 00 61</a>
        </div>
      </div>
      <header className="public-header">
        <div className="public-container public-header-inner">
          <a className="public-brand" href="#accueil">
            <span className="public-brand-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </span>
            <span>
              <strong>SGEE</strong>
              <small>Service de Gestion des Étudiants sénégalais à l’Étranger</small>
            </span>
          </a>
          <nav className="public-nav" aria-label="Navigation principale">
            <a href="#services">Services</a>
            <a href="#actualites">Actualités</a>
            <a href="#demarches">Démarches</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Link className="public-login-btn" to="/login">
            Accéder à mon compte
          </Link>
        </div>
      </header>
    </>
  )
}
