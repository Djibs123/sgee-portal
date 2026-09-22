import { useId, type ReactNode } from 'react'

type AuthShellProps = {
  title: string
  intro?: ReactNode
  children: ReactNode
}

/** Gabarit des pages d'accès (connexion, inscription, mot de passe) : un seul `h1`, contenu principal ciblé par le lien d'évitement. */
export function AuthShell({ title, intro, children }: AuthShellProps) {
  const titleId = useId()

  return (
    <>
      <div className="flag-strip" aria-hidden="true"><span /><span /><span /></div>
      <main className="login-shell" id="main-content">
        <section className="login-panel" aria-labelledby={titleId}>
          <div className="login-brand">
            <div className="login-logo" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div>
              <strong>République du Sénégal</strong>
              <span>Bourses des étudiants sénégalais à l’étranger</span>
            </div>
          </div>

          <div className="login-heading">
            <h1 id={titleId}>{title}</h1>
            {intro && <p>{intro}</p>}
          </div>

          {children}
        </section>
      </main>
    </>
  )
}
