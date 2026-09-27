import { Link } from 'react-router'

/**
 * Le hero dit qui sert qui, puis envoie vers l'action. Le calendrier des campagnes
 * le suit immédiatement (`PublicCampaigns`) : l'échéance est la première information utile.
 */
export function PublicHero() {
  return (
    <section className="public-hero" id="accueil" aria-labelledby="hero-title">
      <div className="public-container public-hero-grid">
        <div className="public-hero-copy">
          <h1 id="hero-title">Bourses des étudiants sénégalais à l’étranger</h1>
          <p>
            Renouvelez votre bourse chaque année, déposez vos justificatifs, tenez vos coordonnées
            bancaires à jour et suivez vos versements, depuis votre pays d’études.
          </p>
          <div className="public-hero-actions">
            <Link className="public-primary-btn" to="/login">
              Accéder à mon espace
            </Link>
            <Link className="public-secondary-btn" to="/candidature">
              Candidater à une bourse
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
