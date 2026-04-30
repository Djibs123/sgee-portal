import { type FormEvent, useState } from 'react'
import { adminLogin, ApiError, type AdminProfile } from '../lib/api'

type AdminLoginPageProps = {
  onAuthenticated: (admin: AdminProfile) => void
}

export function AdminLoginPage({ onAuthenticated }: AdminLoginPageProps) {
  const [email, setEmail] = useState('admin@sgee.local')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await adminLogin(email, password)

      onAuthenticated(result.admin)
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        setError('Identifiants admin invalides')
      } else {
        setError('Connexion admin indisponible')
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
              <span>SG</span>
            </div>
            <div>
              <strong>Administration SGEE</strong>
              <span>Validation des dossiers</span>
            </div>
          </div>

          <div className="login-heading">
            <h1>Espace administrateur</h1>
            <p>Connectez-vous pour traiter les validations en attente.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              <span>Mot de passe</span>
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
