import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { TextField } from '../../components/ui/fields'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { AuthShell } from '../../layouts/AuthShell'
import { getApiErrorMessage, resendApplicantVerification, verifyApplicantEmail } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useUrlToken } from '../../lib/useUrlToken'

/** Nouvel envoi du lien de confirmation (réponse neutre, anti-énumération). */
export function ResendVerificationForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      setFeedback({ tone: 'success', message: (await resendApplicantVerification(email)).message })
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Envoi impossible pour le moment.') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} aria-label="Recevoir un nouveau lien">
      <TextField name="resendEmail" label="Adresse e-mail du compte" type="email" required value={email} onChange={setEmail} autoComplete="email" />
      <StatusMessage tone={feedback?.tone ?? 'success'} message={feedback?.message} />
      <button className="btn btn-secondary" type="submit" disabled={loading}>
        {loading ? 'Envoi…' : 'Recevoir un nouveau lien'}
      </button>
    </form>
  )
}

/**
 * Confirmation explicite par un bouton : les antivirus de messagerie qui ouvrent les liens
 * ne consomment pas le jeton à la place du candidat.
 */
export function VerifyEmailPage() {
  useDocumentTitle('Confirmer mon adresse e-mail')

  const token = useUrlToken()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'failed'>(token ? 'idle' : 'failed')
  const [error, setError] = useState<string | null>(token ? null : 'Ce lien est incomplet.')

  const confirm = async () => {
    if (!token) {
      return
    }

    setState('loading')
    setError(null)

    try {
      await verifyApplicantEmail(token)
      setState('done')
    } catch (reason) {
      setState('failed')
      setError(getApiErrorMessage(reason, 'Ce lien est invalide ou a expiré.'))
    }
  }

  if (state === 'done') {
    return (
      <AuthShell title="Adresse e-mail confirmée">
        <StatusMessage tone="success" message="Votre compte candidat est activé." />
        <div className="wizard-actions">
          <Link className="btn btn-primary" to="/candidature/connexion">
            Me connecter
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Confirmer mon adresse e-mail" intro="Dernière étape avant de déposer votre candidature.">
      {state !== 'failed' && (
        <div className="wizard-actions">
          <button type="button" className="login-submit" disabled={state === 'loading'} onClick={() => void confirm()}>
            {state === 'loading' ? 'Confirmation…' : 'Confirmer mon adresse'}
          </button>
        </div>
      )}
      <StatusMessage tone="error" message={error} />
      {state === 'failed' && <ResendVerificationForm />}
      <p className="login-links">
        <Link to="/candidature/connexion">Me connecter</Link>
        <Link to="/candidature">Retour</Link>
      </p>
    </AuthShell>
  )
}
