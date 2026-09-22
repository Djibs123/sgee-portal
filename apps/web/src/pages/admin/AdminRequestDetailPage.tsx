import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { RequestInfoDialog } from '../../components/admin/RequestInfoDialog'
import { InlineState } from '../../components/InlineState'
import { RequestTimeline } from '../../components/requests/RequestTimeline'
import { InfoItem, InfoList } from '../../components/ui/InfoList'
import { ReasonDialog } from '../../components/ui/ReasonDialog'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { StatusPill } from '../../components/ui/StatusPill'
import {
  approveAdminRequest,
  downloadAdminRequestDocument,
  getAdminRequest,
  getApiErrorMessage,
  rejectAdminRequest,
  requestAdminInfo,
  saveDownloadedFile,
  startAdminReview,
  type AdminRequestDetail,
} from '../../lib/api'
import { formatDate } from '../../lib/format'
import {
  ACADEMIC_RESULT_LABELS,
  levelLabelOf,
  REQUEST_TYPE_LABELS,
  SCHOLARSHIP_STATUS_LABELS,
} from '../../lib/scholarshipLabels'
import { toneOfStatus } from '../../lib/status'
import { useApiResource } from '../../lib/useApiResource'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

type Decision = 'approve' | 'reject' | 'info' | null

const yesNo = (value: boolean) => (value ? 'Oui' : 'Non')

/** Fiche d'instruction : demandeur, demande, alertes, pièces, cursus, historique et décision. */
export function AdminRequestDetailPage() {
  const { requestId = '' } = useParams()
  const load = useCallback(() => getAdminRequest(requestId), [requestId])
  const { data: request, loading, error, setData } = useApiResource(load)
  const [decision, setDecision] = useState<Decision>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  useDocumentTitle(request ? `Demande ${request.reference}` : 'Demande')

  if (!request) {
    return (
      <div>
        <p>
          <Link to="/admin/demandes">Retour aux demandes</Link>
        </p>
        <InlineState loading={loading} error={error} />
      </div>
    )
  }

  const act = async (action: () => Promise<AdminRequestDetail>, success: string) => {
    setDecision(null)
    setBusy(true)
    setFeedback(null)

    try {
      setData(await action())
      setFeedback({ tone: 'success', message: success })
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Action impossible.') })
    } finally {
      setBusy(false)
    }
  }

  const download = async (documentId: string) => {
    try {
      saveDownloadedFile(await downloadAdminRequestDocument(request.id, documentId))
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Téléchargement impossible.') })
    }
  }

  const canDecide = request.status === 'SUBMITTED' || request.status === 'UNDER_REVIEW'
  const warnings = request.eligibility?.warnings ?? []
  const { owner } = request

  return (
    <div className="admin-detail">
      <p>
        <Link to="/admin/demandes">Retour aux demandes</Link>
      </p>
      <div className="admin-page-title toolbar">
        <h1>Demande {request.reference}</h1>
        <StatusPill tone={toneOfStatus(request.status)}>{request.statusLabel}</StatusPill>
      </div>
      <p>
        {REQUEST_TYPE_LABELS[request.type]} – {request.campaign.title}
        {request.submittedAt ? ` – soumise le ${formatDate(request.submittedAt)}` : ''}
      </p>

      <StatusMessage tone={feedback?.tone ?? 'success'} message={feedback?.message} />

      {canDecide && (
        <section className="admin-card" aria-labelledby="decision-title">
          <h2 id="decision-title" className="wizard-title">
            Décision
          </h2>
          <div className="wizard-actions">
            {request.status === 'SUBMITTED' && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void act(() => startAdminReview(request.id), 'Demande prise en charge.')}
              >
                Prendre en charge
              </button>
            )}
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setDecision('info')}>
              Demander un complément
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setDecision('approve')}>
              Accepter
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setDecision('reject')}>
              Refuser
            </button>
          </div>
        </section>
      )}

      {request.decisionComment && !canDecide && (
        <div className="alert info">
          <div>
            <span className="alert-title">Commentaire de décision</span>
            {request.decisionComment}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="alert warning">
          <div>
            <span className="alert-title">Points d’attention ({warnings.length})</span>
            <ul>
              {warnings.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="admin-detail-grid">
        <section className="admin-card" aria-labelledby="owner-title">
          <h2 id="owner-title" className="wizard-title">
            Demandeur
          </h2>
          <InfoList>
            <InfoItem label="Nom">{owner.name}</InfoItem>
            <InfoItem label="E-mail">{owner.email}</InfoItem>
            <InfoItem label="Profil">{owner.studentNumber ? `Boursier n° ${owner.studentNumber}` : 'Candidat'}</InfoItem>
            <InfoItem label="Date de naissance">
              {owner.birthDate ? `${formatDate(owner.birthDate)}${owner.age !== null ? ` (${owner.age} ans)` : ''}` : null}
            </InfoItem>
            {owner.kind === 'STUDENT' && <InfoItem label="Statut de la bourse">{owner.scholarshipStatus ? SCHOLARSHIP_STATUS_LABELS[owner.scholarshipStatus] : null}</InfoItem>}
            {owner.kind === 'STUDENT' && <InfoItem label="Niveau actuel">{levelLabelOf(owner.currentLevel)}</InfoItem>}
          </InfoList>
        </section>

        <section className="admin-card" aria-labelledby="request-title">
          <h2 id="request-title" className="wizard-title">
            Demande
          </h2>
          <InfoList>
            <InfoItem label="Niveau demandé">{request.targetLevelLabel}</InfoItem>
            <InfoItem label="Établissement">{request.institution}</InfoItem>
            <InfoItem label="Filière">{request.fieldOfStudy}</InfoItem>
            <InfoItem label="Formation">{request.programName}</InfoItem>
            <InfoItem label="Lieu">{[request.city, request.country].filter(Boolean).join(', ')}</InfoItem>
            {request.type === 'RENEWAL' ? (
              <>
                <InfoItem label="Année précédente">{request.previousLevelLabel}</InfoItem>
                <InfoItem label="Résultat">{request.previousResult ? ACADEMIC_RESULT_LABELS[request.previousResult] : null}</InfoItem>
                <InfoItem label="Moyenne">{request.previousAverage}</InfoItem>
                <InfoItem label="Changement d’établissement">{yesNo(request.changedInstitution)}</InfoItem>
                <InfoItem label="Changement de filière">{yesNo(request.changedField)}</InfoItem>
              </>
            ) : (
              <>
                <InfoItem label="Baccalauréat">
                  {[request.baccalaureateSeries, request.baccalaureateYear, request.baccalaureateMention].filter(Boolean).join(' – ')}
                </InfoItem>
                <InfoItem label="Moyenne au baccalauréat">{request.baccalaureateAverage}</InfoItem>
              </>
            )}
          </InfoList>
          {request.motivation && (
            <>
              <h3 className="info-section-title">Motivation</h3>
              <p className="admin-motivation">{request.motivation}</p>
            </>
          )}
        </section>
      </div>

      <section className="admin-card" aria-labelledby="documents-title">
        <h2 id="documents-title" className="wizard-title">
          Pièces justificatives
        </h2>
        <ul className="admin-list">
          {request.documents.map((document) => (
            <li key={document.documentTypeCode} className="admin-item">
              <div>
                <strong>
                  {document.label}
                  {document.required ? '' : ' (facultatif)'}
                </strong>
                <p>
                  {document.originalName ?? 'Non déposée'}
                  {document.submittedAt ? ` – ${formatDate(document.submittedAt)}` : ''}
                </p>
                {document.reviewComment && <p>Remarque : {document.reviewComment}</p>}
              </div>
              <div className="admin-actions">
                <StatusPill tone={toneOfStatus(document.status)}>{document.statusLabel}</StatusPill>
                {document.id && document.isDownloadable && (
                  <button type="button" onClick={() => void download(document.id!)} aria-label={`Télécharger ${document.label}`}>
                    Télécharger
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {owner.cursus.length > 0 && (
        <section className="admin-card" aria-labelledby="cursus-title">
          <h2 id="cursus-title" className="wizard-title">
            Cursus
          </h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Année</th>
                  <th scope="col">Niveau</th>
                  <th scope="col">Établissement</th>
                  <th scope="col">Résultat</th>
                </tr>
              </thead>
              <tbody>
                {owner.cursus.map((entry) => (
                  <tr key={`${entry.academicYear}-${entry.level}`}>
                    <th scope="row">
                      {entry.academicYear}
                      {entry.isCurrent ? ' (en cours)' : ''}
                    </th>
                    <td>{entry.level ?? '—'}</td>
                    <td>{entry.institution ?? '—'}</td>
                    <td>{entry.result ? (ACADEMIC_RESULT_LABELS[entry.result as keyof typeof ACADEMIC_RESULT_LABELS] ?? entry.result) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="admin-card" aria-labelledby="history-title">
        <h2 id="history-title" className="wizard-title">
          Historique
        </h2>
        <RequestTimeline history={request.history} perspective="admin" />
      </section>

      <ReasonDialog
        open={decision === 'approve'}
        title="Accepter la demande"
        description={
          request.type === 'RENEWAL'
            ? 'Le dossier du boursier sera mis à jour pour la nouvelle année.'
            : 'Un dossier boursier sera créé pour le candidat.'
        }
        label="Commentaire (facultatif)"
        submitLabel="Accepter"
        minLength={0}
        busy={busy}
        onSubmit={(comment) => void act(() => approveAdminRequest(request.id, comment || undefined), 'Demande acceptée.')}
        onCancel={() => setDecision(null)}
      />
      <ReasonDialog
        open={decision === 'reject'}
        title="Refuser la demande"
        description={request.type === 'RENEWAL' ? 'Le refus d’un renouvellement met fin à la bourse.' : undefined}
        label="Motif communiqué au demandeur"
        submitLabel="Refuser"
        busy={busy}
        onSubmit={(comment) => void act(() => rejectAdminRequest(request.id, comment), 'Demande refusée.')}
        onCancel={() => setDecision(null)}
      />
      <RequestInfoDialog
        open={decision === 'info'}
        documents={request.documents}
        busy={busy}
        onSubmit={(comment, codes) => void act(() => requestAdminInfo(request.id, comment, codes), 'Complément demandé.')}
        onCancel={() => setDecision(null)}
      />
    </div>
  )
}
