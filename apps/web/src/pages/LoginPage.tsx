import { useId, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { StatusMessage } from '../components/ui/StatusMessage'
import { ApiError, getApiErrorMessage, login } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useStudentSession } from '../session/sessions'

type LocationState = { from?: string; expired?: boolean } | null

export function LoginPage() {
  useDocumentTitle('Connexion boursier')

  const { status, signIn } = useStudentSession()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState
  const redirectTo = state?.from?.startsWith('/portal') ? state.from : '/portal'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const identifierId = useId()
  const passwordId = useId()

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(identifier, password)

      signIn(result.student)
      navigate(redirectTo, { replace: true })
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 429
          ? 'Trop de tentatives. Patientez une minute avant de réessayer.'
          : reason instanceof ApiError && reason.status === 401
            ? getApiErrorMessage(reason, 'Identifiants invalides')
            : 'Impossible de contacter le serveur.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flag-strip" aria-hidden="true"><span /><span /><span /></div>
      <main className="login-shell" id="main-content">
        <section className="login-panel" aria-labelledby="login-title">
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
            <h1 id="login-title">Portail boursier SGEE</h1>
            <p>Connectez-vous pour consulter et renouveler votre dossier de bourse.</p>
          </div>

          {state?.expired && (
            <StatusMessage tone="info" message="Votre session a expiré. Reconnectez-vous pour continuer." />
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor={identifierId}>Identifiant ou e-mail</label>
            <input
              id={identifierId}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              required
            />
            <label htmlFor={passwordId}>Mot de passe</label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            <StatusMessage tone="error" message={error} />

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="login-links">
            <Link to="/mot-de-passe-oublie?compte=boursier">Mot de passe oublié ?</Link>
            <Link to="/">Retour à l’accueil</Link>
          </p>
        </section>
      </main>
    </>
  )
}
