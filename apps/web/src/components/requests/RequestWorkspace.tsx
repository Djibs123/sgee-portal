import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  createRequest,
  getApiErrorMessage,
  getCurrentCampaign,
  getRequest,
  listRequests,
  withdrawRequest,
  type RequestSpace,
  type RequestView,
} from '../../lib/api'
import { toneOfStatus } from '../../lib/status'
import { useApiResource } from '../../lib/useApiResource'
import { CampaignBand } from '../CampaignBand'
import { InlineState } from '../InlineState'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { StatusMessage } from '../ui/StatusMessage'
import { StatusPill } from '../ui/StatusPill'
import { RequestOverview } from './RequestOverview'
import { RequestWizard } from './RequestWizard'

type RequestWorkspaceProps = {
  space: RequestSpace
  /** Libellé de l'action de création (« Commencer mon renouvellement », « Déposer ma candidature »). */
  startLabel: string
}

/**
 * Espace « demande de bourse » partagé par le boursier (renouvellement) et le candidat
 * (première demande) : campagne en cours, assistant ou suivi, demandes précédentes.
 */
export function RequestWorkspace({ space, startLabel }: RequestWorkspaceProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const loadCampaign = useCallback(() => getCurrentCampaign(space), [space])
  const loadRequests = useCallback(() => listRequests(space), [space])
  const current = useApiResource(loadCampaign)
  const history = useApiResource(loadRequests)
  const [request, setRequest] = useState<RequestView | null>(null)
  const [requestError, setRequestError] = useState<Error | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const selectedId = searchParams.get('demande') ?? current.data?.request?.id ?? null
  const reloadCampaign = current.reload
  const reloadHistory = history.reload
  const refresh = useCallback(() => {
    reloadCampaign()
    reloadHistory()
  }, [reloadCampaign, reloadHistory])

  useEffect(() => {
    if (!selectedId) {
      return
    }

    let active = true

    getRequest(space, selectedId)
      .then((next) => {
        if (active) {
          setRequest(next)
          setRequestError(null)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setRequestError(reason instanceof Error ? reason : new Error('Requête impossible'))
        }
      })

    return () => {
      active = false
    }
  }, [space, selectedId])

  const handleChange = (next: RequestView) => {
    if (request?.isEditable && !next.isEditable && next.status === 'SUBMITTED') {
      setFlash({
        tone: 'success',
        text: `Demande ${next.reference} envoyée. Vous serez notifié à chaque étape de son instruction.`,
      })
      refresh()
    }

    setRequest(next)
  }

  const start = async (campaignId: string) => {
    setBusy(true)
    setFlash(null)

    try {
      const created = await createRequest(space, campaignId)

      setRequest(created)
      setSearchParams({ demande: created.id })
      refresh()
    } catch (reason) {
      setFlash({ tone: 'error', text: getApiErrorMessage(reason, 'Création de la demande impossible.') })
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async () => {
    if (!request) {
      return
    }

    setBusy(true)

    try {
      setRequest(await withdrawRequest(space, request.id))
      setFlash({ tone: 'success', text: `Demande ${request.reference} retirée.` })
      refresh()
    } catch (reason) {
      setFlash({ tone: 'error', text: getApiErrorMessage(reason, 'Retrait impossible.') })
    } finally {
      setBusy(false)
      setConfirmWithdraw(false)
    }
  }

  // Un rechargement conserve l'affichage (et les régions `aria-live`) : seul le premier chargement bloque.
  if (!current.data) {
    return <InlineState loading={current.loading} error={current.error} />
  }

  const { campaign, request: currentRequest } = current.data
  const blockers = current.data.eligibility?.blockers ?? []
  const shown = selectedId && request?.id === selectedId ? request : null
  // Une demande retirée peut être reprise tant que la campagne est ouverte (même référence).
  const canStart =
    campaign?.phase === 'OPEN' &&
    (!currentRequest || currentRequest.status === 'WITHDRAWN') &&
    blockers.length === 0 &&
    (!shown || shown.id === currentRequest?.id)
  const otherRequests = (history.data?.items ?? []).filter((item) => item.id !== shown?.id)

  return (
    <div className="request-workspace">
      <StatusMessage tone={flash?.tone ?? 'success'} message={flash?.text} />

      {campaign ? (
        <CampaignBand campaign={campaign}>
          {campaign.instructions && <p className="campaign-band-note">{campaign.instructions}</p>}
          {campaign.requirements.length > 0 && (
            <details className="campaign-requirements">
              <summary>Pièces demandées</summary>
              <ul>
                {campaign.requirements.map((requirement) => (
                  <li key={`${requirement.documentTypeCode}-${requirement.cycles.join('-')}`}>
                    {requirement.label}
                    {requirement.isRequired ? '' : ' (facultatif)'}
                    {requirement.cycles.length > 0 ? ` – ${requirement.cycles.join(', ')}` : ''}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CampaignBand>
      ) : (
        <EmptyState title="Aucune campagne en cours" description="Vous serez notifié à l’ouverture de la prochaine campagne." />
      )}

      {(!shown || shown.status === 'WITHDRAWN') && blockers.length > 0 && (
        <div className="alert warning">
          <div>
            <span className="alert-title">Demande impossible pour le moment</span>
            <ul>
              {blockers.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {canStart && campaign && (
        <div className="wizard-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void start(campaign.id)}>
            {busy ? 'Création…' : startLabel}
          </button>
        </div>
      )}

      {selectedId && !shown && <InlineState loading={!requestError} error={requestError} />}

      {shown &&
        (shown.isEditable ? (
          <RequestWizard
            key={shown.id}
            space={space}
            request={shown}
            onChange={handleChange}
            onWithdraw={() => setConfirmWithdraw(true)}
          />
        ) : (
          <RequestOverview
            space={space}
            request={shown}
            onChange={handleChange}
            onWithdraw={() => setConfirmWithdraw(true)}
          />
        ))}

      {otherRequests.length > 0 && (
        <section className="card" aria-labelledby="past-requests-title">
          <h2 id="past-requests-title" className="wizard-title">
            Mes demandes
          </h2>
          <ul className="request-list">
            {otherRequests.map((item) => (
              <li key={item.id}>
                <Link to={`?demande=${item.id}`}>
                  {item.reference} – {item.campaignTitle}
                </Link>
                <StatusPill tone={toneOfStatus(item.status)}>{item.statusLabel}</StatusPill>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmWithdraw}
        title="Retirer la demande ?"
        message="Votre demande ne sera plus instruite. Vous pourrez en déposer une nouvelle tant que la campagne est ouverte."
        confirmLabel="Retirer la demande"
        tone="danger"
        busy={busy}
        onConfirm={() => void withdraw()}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </div>
  )
}
