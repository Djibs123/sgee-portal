import { useState, type FormEvent } from 'react'
import { ApiError, login, type StudentProfile } from '../lib/api'

type LoginPageProps = {
  onAuthenticated: (student: StudentProfile) => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(identifier, password)
      onAuthenticated(result.student)
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        setError('Identifiant ou mot de passe incorrect.')
      } else {
        setError('Connexion temporairement indisponible.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flag-strip"><span /><span /><span /></div>
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-brand">
            <div className="login-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div>
              <strong>Republique du Senegal</strong>
              <span>Bourse &amp; Aide a l'Enseignement Superieur</span>
            </div>
          </div>

          <div className="login-heading">
            <h1>Portail etudiant SGEE</h1>
            <p>Connectez-vous pour consulter votre dossier de bourse.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Identifiant ou email
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </section>
      </main>
    </>
  )
}
