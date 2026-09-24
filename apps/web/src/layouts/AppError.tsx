import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/** Un fragment chargé à la demande devient introuvable après un déploiement. */
const isStaleChunk = (error: unknown) =>
  error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message)

/**
 * Dernier filet : sans elle, une erreur de rendu ou un fragment manquant laisse une page blanche.
 * Le détail technique n'est pas affiché (il peut contenir des données), il part dans la console.
 */
export function AppError() {
  useDocumentTitle('Erreur')

  const error = useRouteError()
  const stale = isStaleChunk(error)

  if (import.meta.env.DEV) {
    console.error(error)
  }

  return (
    <>
      <div className="flag-strip" aria-hidden="true"><span /><span /><span /></div>
      <main className="login-shell" id="main-content">
        <section className="card not-found" aria-labelledby="app-error-title">
          <h1 id="app-error-title">{stale ? 'Une nouvelle version est disponible' : 'Une erreur est survenue'}</h1>
          <p>
            {stale
              ? 'Le portail a été mis à jour pendant votre navigation. Rechargez la page pour continuer.'
              : isRouteErrorResponse(error)
                ? 'La page demandée n’a pas pu être affichée.'
                : 'L’affichage de cette page a échoué. Vos données ne sont pas perdues : réessayez dans un instant.'}
          </p>
          <div className="wizard-actions">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Recharger la page
            </button>
            <Link className="btn btn-secondary" to="/">
              Retour à l’accueil
            </Link>
          </div>
          <p>Si le problème persiste, contactez le SGEE en précisant l’heure et la page concernée.</p>
        </section>
      </main>
    </>
  )
}
