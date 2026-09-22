import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { TextField } from '../components/ui/fields'
import { StatusMessage } from '../components/ui/StatusMessage'
import { AuthShell } from '../layouts/AuthShell'
import { ApiError, getApiErrorMessage, requestPasswordReset, type ResettableAccount } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const ACCOUNTS: Array<{ value: ResettableAccount; param: string; label: string; login: string }> = [
  { value: 'STUDENT', param: 'boursier', label: 'Compte boursier', login: '/login' },
  { value: 'APPLICANT', param: 'candidat', label: 'Compte candidat', login: '/candidature/connexion' },
]

export function ForgotPasswordPage() {
  useDocumentTitle('Mot de passe oublié')

  const [searchParams] = useSearchParams()
  const [account, setAccount] = useState<ResettableAccount>(
    ACCOUNTS.find((item) => item.param === searchParams.get('compte'))?.value ?? 'STUDENT',
  )
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const login = ACCOUNTS.find((item) => item.value === account)?.login ?? '/login'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      setFeedback({ tone: 'success', message: (await requestPasswordReset(email, account)).message })
    } catch (reason) {
      setFeedback({
        tone: 'error',
        message:
          reason instanceof ApiError && reason.status === 429
            ? 'Trop de demandes. Patientez une minute avant de réessayer.'
            : getApiErrorMessage(reason, 'Demande impossible pour le moment.'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      intro="Indiquez l’adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe."
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        <fieldset className="radio-group">
          <legend>Type de compte</legend>
          {ACCOUNTS.map((item) => (
            <label key={item.value}>
              <input
                type="radio"
                name="account"
                value={item.value}
                checked={account === item.value}
                onChange={() => setAccount(item.value)}
              />
              {item.label}
            </label>
          ))}
        </fieldset>
        <TextField name="email" label="Adresse e-mail" type="email" required value={email} onChange={setEmail} autoComplete="email" />

        <StatusMessage tone={feedback?.tone ?? 'success'} message={feedback?.message} />

        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? 'Envoi…' : 'Recevoir le lien'}
        </button>
      </form>

      <p className="login-links">
        <Link to={login}>Retour à la connexion</Link>
        <Link to="/">Retour à l’accueil</Link>
      </p>
    </AuthShell>
  )
}
