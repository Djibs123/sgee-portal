import { PublicFaq } from '../components/public/PublicFaq'
import { PublicFooter } from '../components/public/PublicFooter'
import { PublicHeader } from '../components/public/PublicHeader'
import { PublicHero } from '../components/public/PublicHero'
import { PublicNews } from '../components/public/PublicNews'
import { PublicServices } from '../components/public/PublicServices'

type PublicHomePageProps = {
  onNavigate: (path: string) => void
}

export function PublicHomePage({ onNavigate }: PublicHomePageProps) {
  return (
    <div className="public-page">
      <div className="flag-strip"><span /><span /><span /></div>
      <PublicHeader onNavigate={onNavigate} />
      <main>
        <PublicHero onNavigate={onNavigate} />
        <PublicServices />
        <section className="public-section public-demarches" id="demarches">
          <div className="public-container">
            <div className="public-section-heading">
              <span>Demarches</span>
              <h2>Gerer son dossier de bourse</h2>
              <p>Les principales demarches sont centralisees dans votre espace boursier securise.</p>
            </div>
            <div className="public-steps-grid">
              <article>
                <strong>1</strong>
                <h3>Consulter son dossier</h3>
                <p>Verifiez vos informations administratives, votre cursus et votre statut de bourse.</p>
              </article>
              <article>
                <strong>2</strong>
                <h3>Mettre a jour le RIB</h3>
                <p>Actualisez vos coordonnees bancaires pour faciliter le traitement des paiements.</p>
              </article>
              <article>
                <strong>3</strong>
                <h3>Deposer les justificatifs</h3>
                <p>Transmettez les documents demandes depuis la rubrique Documents.</p>
              </article>
            </div>
          </div>
        </section>
        <PublicNews />
        <PublicFaq />
      </main>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  )
}
