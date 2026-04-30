type PublicHeroProps = {
  onNavigate: (path: string) => void
}

export function PublicHero({ onNavigate }: PublicHeroProps) {
  return (
    <>
      <section className="public-hero" id="accueil">
        <div className="public-container public-hero-grid">
          <div className="public-hero-copy">
            <div className="public-eyebrow">Portail institutionnel SGEE</div>
            <h1>Service de Gestion des Etudiants a l'Etranger</h1>
            <p>
              Un point d'acces officiel pour suivre votre dossier de bourse,
              consulter vos paiements, deposer vos justificatifs et actualiser
              vos informations bancaires.
            </p>
            <div className="public-hero-actions">
              <button type="button" className="public-primary-btn" onClick={() => onNavigate('/portal')}>
                Portail des boursiers
              </button>
              <a className="public-secondary-btn" href="#demarches">
                Voir les demarches
              </a>
            </div>
          </div>
          <aside className="public-access-card" aria-label="Acces rapide">
            <div className="public-card-label">Acces securise</div>
            <h2>Votre espace boursier</h2>
            <p>Connectez-vous avec vos identifiants SGEE pour consulter les informations de votre dossier.</p>
            <button type="button" className="public-card-btn" onClick={() => onNavigate('/login')}>
              Acceder a mon compte
            </button>
            <span>Authentification par session securisee.</span>
          </aside>
        </div>
      </section>
      <section className="public-candidatures" id="candidatures">
        <div className="public-container public-candidatures-inner">
          <div>
            <strong>Candidatures</strong>
            <p>Les candidatures ouvrent selon un calendrier defini par l'administration.</p>
          </div>
          <span>Campagne actuellement fermee</span>
        </div>
      </section>
    </>
  )
}
