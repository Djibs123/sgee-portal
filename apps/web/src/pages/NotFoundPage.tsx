import { Link } from 'react-router'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/** Page introuvable ; `embedded` quand elle s'affiche dans une mise en page (portail, admin). */
export function NotFoundPage({ embedded = false }: { embedded?: boolean }) {
  useDocumentTitle('Page introuvable')

  const content = (
    <section className="card not-found" aria-labelledby="not-found-title">
      <h1 id="not-found-title">Page introuvable</h1>
      <p>L’adresse demandée n’existe pas ou n’est plus disponible.</p>
      <Link className="btn btn-primary" to={embedded ? '/portal' : '/'}>
        {embedded ? 'Retour au tableau de bord' : 'Retour à l’accueil'}
      </Link>
    </section>
  )

  if (embedded) {
    return content
  }

  return (
    <main className="login-shell" id="main-content">
      {content}
    </main>
  )
}
