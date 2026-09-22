import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { TextField } from '../../components/ui/fields'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { AuthShell } from '../../layouts/AuthShell'
import { ApiError, getApiErrorMessage, registerApplicant } from '../../lib/api'
import { PASSWORD_HINT, passwordProblem } from '../../lib/password'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

type Form = {
  firstName: string
  lastName: string
  birthDate: string
  email: string
  phone: string
  password: string
  confirmation: string
}

const EMPTY: Form = { firstName: '', lastName: '', birthDate: '', email: '', phone: '', password: '', confirmation: '' }

export function ApplicantRegisterPage() {
  useDocumentTitle('Créer un compte candidat')

  const [form, setForm] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const set = (key: keyof Form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const nextErrors: Partial<Record<keyof Form, string>> = {}
    const problem = passwordProblem(form.password)

    if (problem) {
      nextErrors.password = problem
    }

    if (form.confirmation !== form.password) {
      nextErrors.confirmation = 'Les deux mots de passe ne correspondent pas.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      event.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus()
      return
    }

    setLoading(true)

    try {
      const result = await registerApplicant({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
        ...(form.phone.trim() ? { phone: form.phone } : {}),
      })

      setDone(result.message)
      setForm(EMPTY)
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 429
          ? 'Trop de tentatives. Patientez une minute avant de réessayer.'
          : getApiErrorMessage(reason, 'Inscription impossible pour le moment.'),
      )
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Vérifiez votre boîte de réception">
        <StatusMessage tone="success" message={done} />
        <p>Ouvrez le lien reçu pour confirmer votre adresse, puis connectez-vous. Pensez à regarder dans les courriers indésirables.</p>
        <p className="login-links">
          <Link to="/candidature/connexion">Me connecter</Link>
          <Link to="/candidature">Retour</Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Créer un compte candidat" intro="Tous les champs sont obligatoires, sauf le téléphone.">
      <form className="form-stack" onSubmit={handleSubmit}>
        <TextField name="firstName" label="Prénom" required value={form.firstName} onChange={set('firstName')} autoComplete="given-name" maxLength={80} />
        <TextField name="lastName" label="Nom" required value={form.lastName} onChange={set('lastName')} autoComplete="family-name" maxLength={80} />
        <TextField name="birthDate" label="Date de naissance" type="date" required value={form.birthDate} onChange={set('birthDate')} autoComplete="bday" />
        <TextField name="email" label="Adresse e-mail" type="email" required value={form.email} onChange={set('email')} autoComplete="email" maxLength={120} />
        <TextField name="phone" label="Téléphone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" hint="Facultatif, avec l’indicatif international, par exemple +33 6 12 34 56 78" />
        <TextField name="password" label="Mot de passe" type="password" required value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint={PASSWORD_HINT} maxLength={128} />
        <TextField name="confirmation" label="Confirmation du mot de passe" type="password" required value={form.confirmation} onChange={set('confirmation')} error={errors.confirmation} autoComplete="new-password" maxLength={128} />

        <StatusMessage tone="error" message={error} />

        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <p className="login-links">
        <Link to="/candidature/connexion">J’ai déjà un compte</Link>
        <Link to="/candidature">Retour</Link>
      </p>
    </AuthShell>
  )
}
