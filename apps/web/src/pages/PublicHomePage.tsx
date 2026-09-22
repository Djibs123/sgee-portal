import { PublicCampaigns } from '../components/public/PublicCampaigns'
import { PublicFaq } from '../components/public/PublicFaq'
import { PublicFooter } from '../components/public/PublicFooter'
import { PublicHeader } from '../components/public/PublicHeader'
import { PublicHero } from '../components/public/PublicHero'
import { PublicNews } from '../components/public/PublicNews'
import { PublicServices } from '../components/public/PublicServices'

export function PublicHomePage() {
  return (
    <div className="public-page">
      <div className="flag-strip" aria-hidden="true"><span /><span /><span /></div>
      <PublicHeader />
      <main>
        <PublicHero />
        <PublicCampaigns />
        <PublicServices />
        <section className="public-section public-demarches" id="demarches">
          <div className="public-container">
            <div className="public-section-heading">
              <span>Démarches</span>
              <h2>Gérer son dossier de bourse</h2>
              <p>Les principales démarches sont centralisées dans votre espace boursier sécurisé.</p>
            </div>
            <div className="public-steps-grid">
              <article>
                <strong>1</strong>
                <h3>Consulter son dossier</h3>
                <p>Vérifiez vos informations administratives, votre cursus et votre statut de bourse.</p>
              </article>
              <article>
                <strong>2</strong>
                <h3>Renouveler chaque année</h3>
                <p>Déposez votre demande de renouvellement pendant la campagne, avant le 31 décembre.</p>
              </article>
              <article>
                <strong>3</strong>
                <h3>Déposer les justificatifs</h3>
                <p>Transmettez les documents demandés et tenez votre RIB à jour.</p>
              </article>
            </div>
          </div>
        </section>
        <PublicNews />
        <PublicFaq />
      </main>
      <PublicFooter />
    </div>
  )
}
