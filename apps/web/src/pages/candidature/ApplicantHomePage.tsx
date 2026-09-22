import { Link, Navigate } from 'react-router'
import { InlineState } from '../../components/InlineState'
import { StatusPill } from '../../components/ui/StatusPill'
import { AuthShell } from '../../layouts/AuthShell'
import { listPublicCampaigns } from '../../lib/api'
import { campaignPeriod } from '../../lib/campaigns'
import { useApiResource } from '../../lib/useApiResource'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useApplicantSession } from '../../session/sessions'

/** Accueil des candidats : campagne de première demande, conditions et accès au compte. */
export function ApplicantHomePage() {
  useDocumentTitle('Candidature')

  const { status } = useApplicantSession()
  const { data, loading, error } = useApiResource(listPublicCampaigns)

  if (status === 'authenticated') {
    return <Navigate to="/candidature/espace" replace />
  }

  const campaigns = (data?.items ?? []).filter((campaign) => campaign.type === 'NEW_APPLICATION')
  const maxAge = campaigns.find((campaign) => campaign.maxAgeNonDoctoral)?.maxAgeNonDoctoral ?? 30

  return (
    <AuthShell
      title="Candidature à la bourse"
      intro="Première demande de bourse pour les bacheliers et étudiants sénégalais admis dans l’enseignement supérieur à l’étranger."
    >
      <InlineState loading={loading} error={error} />
      {!loading && !error && campaigns.length === 0 && (
        <p>Aucune campagne de candidature n’est programmée pour le moment.</p>
      )}
      {campaigns.length > 0 && (
        <ul className="request-list" aria-label="Campagnes de candidature">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <span>
                <strong>{campaign.title}</strong>
                <br />
                {campaignPeriod(campaign)}
              </span>
              <StatusPill tone={campaign.phase === 'OPEN' ? 'success' : 'neutral'}>{campaign.phaseLabel}</StatusPill>
            </li>
          ))}
        </ul>
      )}

      <h2 className="info-section-title">Conditions</h2>
      <ul className="bullet-list">
        <li>Être de nationalité sénégalaise.</li>
        <li>Être admis dans un établissement d’enseignement supérieur.</li>
        <li>Avoir au plus {maxAge} ans, sauf pour une inscription en doctorat.</li>
      </ul>

      <div className="wizard-actions">
        <Link className="btn btn-primary" to="/candidature/inscription">
          Créer mon compte candidat
        </Link>
        <Link className="btn btn-secondary" to="/candidature/connexion">
          J’ai déjà un compte
        </Link>
      </div>

      <p className="login-links">
        <Link to="/login">Déjà boursier ? Espace boursier</Link>
        <Link to="/">Retour à l’accueil</Link>
      </p>
    </AuthShell>
  )
}
