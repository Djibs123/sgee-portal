type PublicFooterProps = {
  onNavigate: (path: string) => void
}

export function PublicFooter({ onNavigate }: PublicFooterProps) {
  return (
    <footer className="public-footer" id="contact">
      <div className="public-container">
        <div className="public-contact-band">
          <div>
            <span>Contact & assistance</span>
            <strong>01 71 25 00 61</strong>
            <p>Infoline SVI disponible 24h/24 et 7j/7.</p>
          </div>
            <a className="public-contact-button" href="tel:+33171250061">
              Appeler l’infoline
            </a>
        </div>
        <div className="public-footer-grid">
          <div>
            <strong>SGEE</strong>
            <p>
              Service de Gestion des Etudiants a l'Etranger, sous tutelle du
              Ministere de l'Enseignement Superieur.
            </p>
          </div>
          <div>
            <h3>Navigation</h3>
            <a href="#services">Services</a>
            <a href="#actualites">Actualites</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <h3>Portail</h3>
            <button type="button" onClick={() => onNavigate('/login')}>Mon espace boursier</button>
            <button type="button" onClick={() => onNavigate('/portal')}>Paiements et documents</button>
          </div>
        </div>
        <div className="public-footer-bottom">
          <span>© 2026 SGEE - Republique du Senegal.</span>
          <div className="public-footer-flag"><span /><span /><span /></div>
        </div>
      </div>
    </footer>
  )
}
