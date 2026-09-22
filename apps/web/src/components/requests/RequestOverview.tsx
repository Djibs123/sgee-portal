import type { RequestSpace, RequestView } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { toneOfStatus } from '../../lib/status'
import { ACADEMIC_RESULT_LABELS } from '../../lib/scholarshipLabels'
import { InfoItem, InfoList } from '../ui/InfoList'
import { StatusPill } from '../ui/StatusPill'
import { RequestDocuments } from './RequestDocuments'
import { RequestTimeline } from './RequestTimeline'

type RequestOverviewProps = {
  space: RequestSpace
  request: RequestView
  onChange: (request: RequestView) => void
  onWithdraw?: () => void
}

/** Demande envoyée ou décidée : consultation seule, suivi et retrait avant décision. */
export function RequestOverview({ space, request, onChange, onWithdraw }: RequestOverviewProps) {
  const canWithdraw = request.status === 'SUBMITTED' || request.status === 'UNDER_REVIEW'

  return (
    <section className="card" aria-labelledby="request-overview-title">
      <div className="toolbar">
        <h2 id="request-overview-title" className="wizard-title">
          Demande {request.reference}
        </h2>
        <StatusPill tone={toneOfStatus(request.status)}>{request.statusLabel}</StatusPill>
      </div>
      <p>
        {request.campaign.title}
        {request.submittedAt ? ` – envoyée le ${formatDate(request.submittedAt)}` : ''}
      </p>

      {request.status === 'APPROVED' && (
        <div className="alert success">
          <div>
            <span className="alert-title">Demande acceptée</span>
            {request.decisionComment ?? 'Votre dossier est à jour pour la nouvelle année universitaire.'}
          </div>
        </div>
      )}
      {request.status === 'REJECTED' && (
        <div className="alert warning">
          <div>
            <span className="alert-title">Demande refusée</span>
            {request.decisionComment ?? 'Aucun motif précisé.'} Un recours peut être adressé au SGEE.
          </div>
        </div>
      )}

      <InfoList>
        <InfoItem label="Niveau demandé">{request.targetLevelLabel}</InfoItem>
        <InfoItem label="Établissement">{request.institution}</InfoItem>
        <InfoItem label="Filière">{request.fieldOfStudy}</InfoItem>
        <InfoItem label="Lieu">{[request.city, request.country].filter(Boolean).join(', ')}</InfoItem>
        {request.type === 'RENEWAL' && (
          <InfoItem label="Résultat de l’année précédente">
            {request.previousResult ? ACADEMIC_RESULT_LABELS[request.previousResult] : null}
          </InfoItem>
        )}
      </InfoList>

      <h3 className="info-section-title">Pièces justificatives</h3>
      <RequestDocuments space={space} request={request} onChange={onChange} />

      <h3 className="info-section-title">Historique</h3>
      <RequestTimeline history={request.history} />

      {canWithdraw && onWithdraw && (
        <div className="wizard-actions">
          <button type="button" className="btn btn-secondary" onClick={onWithdraw}>
            Retirer ma demande
          </button>
        </div>
      )}
    </section>
  )
}
