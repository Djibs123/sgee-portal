import { Link } from 'react-router'
import { NotificationsPanel } from '../../components/NotificationsPanel'
import { RequestWorkspace } from '../../components/requests/RequestWorkspace'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useApplicantSession } from '../../session/sessions'

export function ApplicantSpacePage() {
  useDocumentTitle('Ma candidature')

  const { profile } = useApplicantSession()

  return (
    <div className="applicant-space">
      <div className="page-header">
        <h1>Ma candidature</h1>
        <p>Bonjour {profile?.firstName}, complétez votre demande puis suivez son instruction ici.</p>
      </div>

      {profile?.studentNumber && (
        <div className="alert success">
          <div>
            <span className="alert-title">Bourse attribuée</span>
            Votre dossier boursier n° {profile.studentNumber} est ouvert. Connectez-vous à l’espace boursier avec la
            même adresse e-mail et le même mot de passe pour déposer votre RIB et suivre vos versements.{' '}
            <Link to="/login">Accéder à l’espace boursier</Link>
          </div>
        </div>
      )}

      <RequestWorkspace space="applicant" startLabel="Déposer ma candidature" />

      <NotificationsPanel space="applicant" />
    </div>
  )
}
