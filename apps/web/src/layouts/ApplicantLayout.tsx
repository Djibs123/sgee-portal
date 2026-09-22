import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { useApplicantSession } from '../session/sessions'
import { FullPageMessage } from './FullPageMessage'
import { SkipLink } from './SkipLink'

/** Espace candidat : accès réservé aux sessions candidat valides. */
export function ApplicantLayout() {
  const { profile, status, expired, signOut } = useApplicantSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  if (status === 'loading') {
    return <FullPageMessage>Vérification de la session…</FullPageMessage>
  }

  if (!profile) {
    return <Navigate to="/candidature/connexion" replace state={{ from: location.pathname, expired }} />
  }

  const leave = async () => {
    setLeaving(true)

    try {
      await signOut()
    } finally {
      navigate('/candidature', { replace: true })
    }
  }

  return (
    <>
      <SkipLink />
      <div className="flag-strip" aria-hidden="true"><span /><span /><span /></div>
      <header className="applicant-header">
        <div className="applicant-header-inner">
          <Link to="/" className="applicant-brand">
            SGEE <span>Espace candidat</span>
          </Link>
          <span className="applicant-user">
            {profile.firstName} {profile.lastName}
          </span>
          <button type="button" className="btn btn-secondary" disabled={leaving} onClick={() => void leave()}>
            Se déconnecter
          </button>
        </div>
      </header>
      <main id="main-content" className="applicant-main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  )
}
