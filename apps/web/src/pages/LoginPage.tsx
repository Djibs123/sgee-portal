import { useId, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { StatusMessage } from '../components/ui/StatusMessage'
import { AuthShell } from '../layouts/AuthShell'
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
    <AuthShell title="Portail boursier SGEE" intro="Connectez-vous pour consulter et renouveler votre dossier de bourse.">
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
    </AuthShell>
  )
}
