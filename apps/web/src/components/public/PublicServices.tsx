const services = [
  {
    title: 'Suivi du dossier',
    text: 'Consultez votre statut de bourse, votre cursus et les informations administratives utiles.',
  },
  {
    title: 'Paiements',
    text: "Retrouvez l'historique de vos versements et les informations de traitement disponibles.",
  },
  {
    title: 'Documents',
    text: 'Deposez vos justificatifs et suivez les pieces attendues dans votre espace securise.',
  },
  {
    title: 'Coordonnees RIB',
    text: 'Mettez a jour vos coordonnees bancaires depuis le portail des boursiers.',
  },
]

export function PublicServices() {
  return (
    <section className="public-section" id="services">
      <div className="public-container">
        <div className="public-section-heading">
          <span>Services</span>
          <h2>Les services numeriques du SGEE</h2>
          <p>Des informations claires pour accompagner les etudiants boursiers a l'etranger.</p>
        </div>
        <div className="public-services-grid">
          {services.map((service) => (
            <article className="public-service-card" key={service.title}>
              <div className="public-service-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
