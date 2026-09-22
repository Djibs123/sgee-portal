import { Link } from 'react-router'
import { listPublicCampaigns, type CampaignView } from '../../lib/api'
import { campaignPeriod } from '../../lib/campaigns'
import { useApiResource } from '../../lib/useApiResource'

const ACTIONS: Record<CampaignView['type'], { to: string; label: string }> = {
  RENEWAL: { to: '/login', label: 'Renouveler ma bourse' },
  NEW_APPLICATION: { to: '/candidature', label: 'Déposer une candidature' },
}

/** Calendrier des campagnes de l'année en cours, publié par l'API (plus de texte figé). */
export function PublicCampaigns() {
  const { data, loading, error } = useApiResource(listPublicCampaigns)
  const campaigns = data?.items ?? []

  return (
    <section className="public-candidatures" id="candidatures" aria-labelledby="candidatures-title">
      <div className="public-container public-candidatures-inner">
        <div>
          <h2 id="candidatures-title">Campagnes en cours</h2>
          {loading && <p role="status">Chargement du calendrier…</p>}
          {(error || (!loading && campaigns.length === 0)) && (
            <p>Les campagnes ouvrent selon le calendrier défini par l’administration.</p>
          )}
        </div>
        {campaigns.length > 0 && (
          <ul className="public-campaign-list">
            {campaigns.map((campaign) => (
              <li key={campaign.id}>
                <strong>{campaign.title}</strong>
                <p>
                  {campaign.phaseLabel} – {campaignPeriod(campaign)}
                </p>
                {campaign.phase === 'OPEN' && (
                  <Link to={ACTIONS[campaign.type].to}>{ACTIONS[campaign.type].label}</Link>
                )}
              </li>
            ))}
          </ul>
        )}
        <Link to="/candidature">Espace candidat</Link>
      </div>
    </section>
  )
}
