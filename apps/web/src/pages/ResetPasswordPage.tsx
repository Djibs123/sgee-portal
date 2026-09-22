import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { TextField } from '../components/ui/fields'
import { StatusMessage } from '../components/ui/StatusMessage'
import { AuthShell } from '../layouts/AuthShell'
import { getApiErrorMessage, resetPassword } from '../lib/api'
import { PASSWORD_HINT, passwordProblem } from '../lib/password'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useUrlToken } from '../lib/useUrlToken'

export function ResetPasswordPage() {
  useDocumentTitle('Nouveau mot de passe')

  const token = useUrlToken()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(token ? null : 'Ce lien est incomplet. Demandez-en un nouveau.')
  const [done, setDone] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = {
      password: passwordProblem(password) ?? undefined,
      confirmation: confirmation === password ? undefined : 'Les deux mots de passe ne correspondent pas.',
    }

    setErrors(nextErrors)

    if (nextErrors.password || nextErrors.confirmation || !token) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    setLoading(true)
    setError(null)

    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Ce lien est invalide ou a expiré. Demandez-en un nouveau.'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Mot de passe modifié">
        <StatusMessage tone="success" message="Votre mot de passe a été changé et toutes vos sessions ouvertes ont été fermées." />
        <p className="login-links">
          <Link to="/login">Espace boursier</Link>
          <Link to="/candidature/connexion">Espace candidat</Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choisir un nouveau mot de passe">
      <form className="form-stack" onSubmit={handleSubmit}>
        <TextField name="password" label="Nouveau mot de passe" type="password" required value={password} onChange={setPassword} error={errors.password} hint={PASSWORD_HINT} autoComplete="new-password" maxLength={128} />
        <TextField name="confirmation" label="Confirmation" type="password" required value={confirmation} onChange={setConfirmation} error={errors.confirmation} autoComplete="new-password" maxLength={128} />

        <StatusMessage tone="error" message={error} />

        <button className="login-submit" type="submit" disabled={loading || !token}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      <p className="login-links">
        <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
        <Link to="/">Retour à l’accueil</Link>
      </p>
    </AuthShell>
  )
}
