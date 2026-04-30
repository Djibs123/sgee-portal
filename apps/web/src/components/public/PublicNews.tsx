const news = [
  'Resultats et prochaines etapes des demandes de bourses 2025/2026',
  'Depot des demandes et renouvellements: pieces attendues',
  'Mise a jour des coordonnees bancaires pour les virements',
]

export function PublicNews() {
  return (
    <section className="public-section public-news-section" id="actualites">
      <div className="public-container">
        <div className="public-section-heading">
          <span>Actualites</span>
          <h2>Informations et annonces du SGEE</h2>
        </div>
        <div className="public-news-layout">
          <article className="public-news-featured">
            <span>Annonce importante</span>
            <h3>Demandes de bourses 2025/2026</h3>
            <p>
              Les etudiants sont invites a consulter regulierement les annonces
              officielles et leur espace boursier pour suivre les etapes de
              traitement de leur dossier.
            </p>
            <small>SGEE Communication</small>
          </article>
          <div className="public-news-list">
            {news.map((item) => (
              <article className="public-news-item" key={item}>
                <div className="public-news-dot" />
                <h3>{item}</h3>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
