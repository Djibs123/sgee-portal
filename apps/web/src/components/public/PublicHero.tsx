import { Link } from 'react-router'

export function PublicHero() {
  return (
    <>
      <section className="public-hero" id="accueil" aria-labelledby="hero-title">
        <div className="public-container public-hero-grid">
          <div className="public-hero-copy">
            <p className="public-eyebrow">Portail institutionnel SGEE</p>
            <h1 id="hero-title">Service de Gestion des Étudiants sénégalais à l’Étranger</h1>
            <p>
              Un point d’accès officiel pour suivre votre dossier de bourse, renouveler
              votre bourse chaque année, consulter vos paiements, déposer vos justificatifs
              et actualiser vos informations bancaires.
            </p>
            <div className="public-hero-actions">
              <Link className="public-primary-btn" to="/portal">
                Portail des boursiers
              </Link>
              <a className="public-secondary-btn" href="#demarches">
                Voir les démarches
              </a>
            </div>
          </div>
          <aside className="public-access-card" aria-labelledby="access-title">
            <p className="public-card-label">Accès sécurisé</p>
            <h2 id="access-title">Votre espace boursier</h2>
            <p>Connectez-vous avec vos identifiants SGEE pour consulter les informations de votre dossier.</p>
            <Link className="public-card-btn" to="/login">
              Accéder à mon compte
            </Link>
            <span>Authentification par session sécurisée.</span>
          </aside>
        </div>
      </section>
      <section className="public-candidatures" id="candidatures" aria-labelledby="candidatures-title">
        <div className="public-container public-candidatures-inner">
          <div>
            <h2 id="candidatures-title">Candidatures</h2>
            <p>Les candidatures ouvrent selon le calendrier défini par l’administration.</p>
          </div>
          <Link to="/candidature">Espace candidat</Link>
        </div>
      </section>
    </>
  )
}
