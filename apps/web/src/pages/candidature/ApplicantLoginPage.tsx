import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { TextField } from '../../components/ui/fields'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { AuthShell } from '../../layouts/AuthShell'
import { ApiError, applicantLogin, getApiErrorMessage } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useApplicantSession } from '../../session/sessions'
import { ResendVerificationForm } from './VerifyEmailPage'

type LocationState = { from?: string; expired?: boolean } | null

export function ApplicantLoginPage() {
  useDocumentTitle('Connexion candidat')

  const { status, signIn } = useApplicantSession()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState
  const redirectTo = state?.from?.startsWith('/candidature/espace') ? state.from : '/candidature/espace'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setUnverified(false)

    try {
      const result = await applicantLogin(email, password)

      signIn(result.applicant)
      navigate(redirectTo, { replace: true })
    } catch (reason) {
      setUnverified(reason instanceof ApiError && reason.status === 403)
      setError(
        reason instanceof ApiError && reason.status === 429
          ? 'Trop de tentatives. Patientez une minute avant de réessayer.'
          : reason instanceof ApiError && (reason.status === 401 || reason.status === 403)
            ? getApiErrorMessage(reason, 'Identifiants invalides')
            : 'Impossible de contacter le serveur.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Espace candidat" intro="Connectez-vous pour compléter et suivre votre candidature.">
      {state?.expired && <StatusMessage tone="info" message="Votre session a expiré. Reconnectez-vous pour continuer." />}

      <form className="form-stack" onSubmit={handleSubmit}>
        <TextField name="email" label="Adresse e-mail" type="email" required value={email} onChange={setEmail} autoComplete="username" />
        <TextField name="password" label="Mot de passe" type="password" required value={password} onChange={setPassword} autoComplete="current-password" />

        <StatusMessage tone="error" message={error} />

        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      {unverified && <ResendVerificationForm initialEmail={email} />}

      <p className="login-links">
        <Link to="/mot-de-passe-oublie?compte=candidat">Mot de passe oublié ?</Link>
        <Link to="/candidature/inscription">Créer un compte</Link>
      </p>
    </AuthShell>
  )
}
