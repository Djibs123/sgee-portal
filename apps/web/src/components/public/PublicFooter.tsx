import { Link } from 'react-router'

export function PublicFooter() {
  return (
    <footer className="public-footer" id="contact">
      <div className="public-container">
        <div className="public-contact-band">
          <div>
            <span>Contact et assistance</span>
            <strong>01 71 25 00 61</strong>
            <p>Infoline SVI disponible 24 h/24 et 7 j/7.</p>
          </div>
          <a className="public-contact-button" href="tel:+33171250061">
            Appeler l’infoline
          </a>
        </div>
        <div className="public-footer-grid">
          <div>
            <strong>SGEE</strong>
            <p>
              Service de Gestion des Étudiants sénégalais à l’Étranger, sous tutelle du
              ministère de l’Enseignement supérieur.
            </p>
          </div>
          <nav aria-label="Pied de page">
            <h3>Navigation</h3>
            <a href="#services">Services</a>
            <a href="#actualites">Actualités</a>
            <a href="#faq">FAQ</a>
          </nav>
          <nav aria-label="Accès aux espaces">
            <h3>Portail</h3>
            <Link to="/login">Espace boursier</Link>
            <Link to="/candidature">Espace candidat</Link>
          </nav>
        </div>
        <div className="public-footer-bottom">
          <span>© 2026 SGEE – République du Sénégal.</span>
          <div className="public-footer-flag" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </div>
    </footer>
  )
}
