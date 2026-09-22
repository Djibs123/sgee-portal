import { useState } from 'react'
import { Link } from 'react-router'
import { AcademicYearDialog } from '../../components/admin/AcademicYearDialog'
import { CampaignFormDialog } from '../../components/admin/CampaignFormDialog'
import { InlineState } from '../../components/InlineState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { StatusPill } from '../../components/ui/StatusPill'
import {
  closeAdminCampaign,
  getApiErrorMessage,
  listAcademicYears,
  listAdminCampaigns,
  type AdminCampaign,
} from '../../lib/api'
import { campaignPeriod } from '../../lib/campaigns'
import { REQUEST_TYPE_LABELS, REVIEWABLE_STATUS_LABELS } from '../../lib/scholarshipLabels'
import { useApiResource } from '../../lib/useApiResource'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useAdminSession } from '../../session/sessions'

const loadAll = async () => {
  const [campaigns, years] = await Promise.all([listAdminCampaigns(), listAcademicYears()])

  return { campaigns: campaigns.items, years: years.items }
}

type Editing = { campaign: AdminCampaign | null; key: number } | null

/** Campagnes annuelles : consultation pour tous, création, modification et clôture pour les super-administrateurs. */
export function AdminCampaignsPage() {
  useDocumentTitle('Campagnes')

  const { profile } = useAdminSession()
  const canManage = profile?.role === 'SUPER_ADMIN'
  const { data, loading, error, reload } = useApiResource(loadAll)
  const [editing, setEditing] = useState<Editing>(null)
  const [creatingYear, setCreatingYear] = useState(false)
  const [closing, setClosing] = useState<AdminCampaign | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const saved = (message: string) => {
    setEditing(null)
    setCreatingYear(false)
    setFeedback({ tone: 'success', message })
    reload()
  }

  const close = async () => {
    if (!closing) {
      return
    }

    setBusy(true)

    try {
      await closeAdminCampaign(closing.id)
      saved(`Campagne « ${closing.title} » clôturée.`)
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Clôture impossible.') })
    } finally {
      setBusy(false)
      setClosing(null)
    }
  }

  return (
    <div>
      <div className="admin-page-title toolbar">
        <div>
          <h1>Campagnes</h1>
          <p>Renouvellements (1er septembre – 31 décembre) et candidatures, par année universitaire.</p>
        </div>
        {canManage && data && (
          <div className="wizard-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setCreatingYear(true)}>
              Nouvelle année
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setEditing({ campaign: null, key: Date.now() })}>
              Nouvelle campagne
            </button>
          </div>
        )}
      </div>

      <StatusMessage tone={feedback?.tone ?? 'success'} message={feedback?.message} />
      <InlineState loading={loading && !data} error={data ? null : error} />
      {data && data.campaigns.length === 0 && <EmptyState title="Aucune campagne" />}

      {data && data.campaigns.length > 0 && (
        <section className="admin-card">
          <div className="table-wrapper">
            <table className="data-table">
              <caption>{data.campaigns.length} campagne(s)</caption>
              <thead>
                <tr>
                  <th scope="col">Campagne</th>
                  <th scope="col">Période</th>
                  <th scope="col">État</th>
                  <th scope="col">Demandes</th>
                  {canManage && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((campaign) => {
                  const counts = Object.entries(campaign.requestCounts).filter(([status]) => status !== 'DRAFT')

                  return (
                    <tr key={campaign.id}>
                      <th scope="row">
                        {campaign.title}
                        <br />
                        <small>
                          {REQUEST_TYPE_LABELS[campaign.type]} – {campaign.academicYear.label} – {campaign.requirements.length} pièce(s)
                        </small>
                      </th>
                      <td>{campaignPeriod(campaign)}</td>
                      <td>
                        <StatusPill tone={campaign.phase === 'OPEN' ? 'success' : 'neutral'}>{campaign.phaseLabel}</StatusPill>
                      </td>
                      <td>
                        {counts.length === 0 ? (
                          '—'
                        ) : (
                          <Link to={`/admin/demandes?campaignId=${campaign.id}`} aria-label={`Demandes de la campagne ${campaign.title}`}>
                            {counts.map(([status, count]) => `${REVIEWABLE_STATUS_LABELS[status] ?? status} : ${count}`).join(', ')}
                          </Link>
                        )}
                      </td>
                      {canManage && (
                        <td>
                          <div className="admin-actions">
                            <button
                              type="button"
                              onClick={() => setEditing({ campaign, key: Date.now() })}
                              aria-label={`Modifier ${campaign.title}`}
                            >
                              Modifier
                            </button>
                            {campaign.phase !== 'CLOSED' && (
                              <button type="button" onClick={() => setClosing(campaign)} aria-label={`Clôturer ${campaign.title}`}>
                                Clôturer
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data && editing && (
        <CampaignFormDialog
          key={editing.key}
          open
          campaign={editing.campaign}
          campaigns={data.campaigns}
          years={data.years}
          onSaved={saved}
          onCancel={() => setEditing(null)}
        />
      )}
      {creatingYear && <AcademicYearDialog open onSaved={saved} onCancel={() => setCreatingYear(false)} />}
      <ConfirmDialog
        open={closing !== null}
        title="Clôturer la campagne ?"
        message="Plus aucune demande ne pourra être créée ni envoyée. Les demandes déjà envoyées restent à instruire."
        confirmLabel="Clôturer"
        tone="danger"
        busy={busy}
        onConfirm={() => void close()}
        onCancel={() => setClosing(null)}
      />
    </div>
  )
}
