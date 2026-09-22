import { useId, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { StatusMessage } from '../components/ui/StatusMessage'
import { adminLogin, ApiError, getApiErrorMessage } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useAdminSession } from '../session/sessions'

type LocationState = { from?: string; expired?: boolean } | null

export function AdminLoginPage() {
  useDocumentTitle('Connexion administration')

  const { status, signIn } = useAdminSession()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState
  const redirectTo = state?.from?.startsWith('/admin') ? state.from : '/admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailId = useId()
  const passwordId = useId()

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await adminLogin(email, password)

      signIn(result.admin)
      navigate(redirectTo, { replace: true })
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 429
          ? 'Trop de tentatives. Patientez une minute avant de réessayer.'
          : reason instanceof ApiError && reason.status === 401
            ? getApiErrorMessage(reason, 'Identifiants invalides')
            : 'Connexion à l’administration indisponible.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flag-strip" aria-hidden="true"><span /><span /><span /></div>
      <main className="login-shell" id="main-content">
        <section className="login-panel" aria-labelledby="admin-login-title">
          <div className="login-brand">
            <div className="login-logo" aria-hidden="true">
              <span>SG</span>
            </div>
            <div>
              <strong>Administration SGEE</strong>
              <span>Instruction des dossiers</span>
            </div>
          </div>

          <div className="login-heading">
            <h1 id="admin-login-title">Espace administration</h1>
            <p>Accès réservé aux agents du SGEE.</p>
          </div>

          {state?.expired && (
            <StatusMessage tone="info" message="Votre session a expiré. Reconnectez-vous pour continuer." />
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor={emailId}>E-mail professionnel</label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
        </section>
      </main>
    </>
  )
}
