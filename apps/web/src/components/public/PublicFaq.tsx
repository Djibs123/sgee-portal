const faq = [
  {
    question: 'Qui peut acceder au portail des boursiers ?',
    answer:
      "Les etudiants disposant d'un dossier SGEE et d'identifiants actifs peuvent acceder a leur espace securise.",
  },
  {
    question: 'Comment modifier mes coordonnees bancaires ?',
    answer:
      'La modification du RIB se fait depuis la rubrique Coordonnees RIB du portail connecte.',
  },
  {
    question: 'Quels documents puis-je deposer ?',
    answer:
      'Le portail permet le depot de justificatifs comme certificat de scolarite, piece d identite, RIB ou autre document demande.',
  },
  {
    question: 'Les candidatures sont-elles ouvertes ?',
    answer:
      "La campagne est actuellement fermee. Les ouvertures suivent le calendrier defini par l'administration.",
  },
]

export function PublicFaq() {
  return (
    <section className="public-section" id="faq">
      <div className="public-container">
        <div className="public-section-heading">
          <span>FAQ</span>
          <h2>Questions frequentes</h2>
          <p>Les reponses essentielles pour comprendre les services du portail SGEE.</p>
        </div>
        <div className="public-faq-list">
          {faq.map((item) => (
            <details className="public-faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
