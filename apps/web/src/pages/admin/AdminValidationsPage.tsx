import { useCallback, useState } from 'react'
import { InlineState } from '../../components/InlineState'
import { ReasonDialog } from '../../components/ui/ReasonDialog'
import { StatusMessage } from '../../components/ui/StatusMessage'
import {
  downloadAdminDocument,
  getAdminPendingDocuments,
  getAdminPendingRibs,
  getApiErrorMessage,
  rejectAdminDocument,
  rejectAdminRib,
  revealAdminRibIban,
  saveDownloadedFile,
  validateAdminDocument,
  validateAdminRib,
} from '../../lib/api'
import { formatDate } from '../../lib/format'
import { useApiResource } from '../../lib/useApiResource'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

type Rejection = { kind: 'document' | 'rib'; id: string; label: string } | null

const loadPending = async () => {
  const [documents, ribs] = await Promise.all([getAdminPendingDocuments(), getAdminPendingRibs()])

  return { documents: documents.items, ribs: ribs.items, ribTotal: ribs.total }
}

/** Pièces du dossier boursier et changements de RIB soumis par les boursiers. */
export function AdminValidationsPage() {
  useDocumentTitle('Documents et RIB')

  const { data, loading, error, reload } = useApiResource(loadPending)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [revealedIbans, setRevealedIbans] = useState<Record<string, string>>({})
  const [rejection, setRejection] = useState<Rejection>(null)

  const run = useCallback(
    async (id: string, action: () => Promise<unknown>, success: string, failure: string) => {
      setFeedback(null)
      setBusyId(id)

      try {
        await action()
        setFeedback({ tone: 'success', message: success })
        reload()
      } catch (reason) {
        setFeedback({ tone: 'error', message: getApiErrorMessage(reason, failure) })
      } finally {
        setBusyId(null)
      }
    },
    [reload],
  )

  const download = async (documentId: string) => {
    try {
      saveDownloadedFile(await downloadAdminDocument(documentId))
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Téléchargement impossible.') })
    }
  }

  // Consultation journalisée côté API : l'IBAN complet n'est chargé qu'à la demande.
  const reveal = async (ribId: string) => {
    setBusyId(ribId)

    try {
      const { iban } = await revealAdminRibIban(ribId)

      setRevealedIbans((current) => ({ ...current, [ribId]: iban }))
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Affichage de l’IBAN impossible.') })
    } finally {
      setBusyId(null)
    }
  }

  const confirmRejection = (reason: string) => {
    if (!rejection) {
      return
    }

    const { kind, id, label } = rejection

    setRejection(null)
    void run(
      id,
      () => (kind === 'document' ? rejectAdminDocument(id, reason) : rejectAdminRib(id, reason)),
      `${label} : refus enregistré, le boursier est notifié.`,
      'Refus impossible.',
    )
  }

  return (
    <div>
      <div className="admin-page-title">
        <h1>Documents et RIB</h1>
        <p>Pièces du dossier boursier et changements de coordonnées bancaires à valider.</p>
      </div>

      <StatusMessage tone={feedback?.tone ?? 'success'} message={feedback?.message} />
      <InlineState loading={loading && !data} error={data ? null : error} />

      {data && (
        <>
          <section className="admin-card" aria-labelledby="pending-documents-title">
            <div className="admin-section-heading">
              <h2 id="pending-documents-title">Documents en attente</h2>
              <span>{data.documents.length}</span>
            </div>
            {data.documents.length === 0 ? (
              <p className="admin-empty">Aucun document en attente.</p>
            ) : (
              <ul className="admin-list">
                {data.documents.map((document) => {
                  const label = `${document.nom} – ${document.student.firstName} ${document.student.lastName}`

                  return (
                    <li className="admin-item" key={document.id}>
                      <div>
                        <strong>{document.nom}</strong>
                        <p>
                          {document.student.code} – {document.student.firstName} {document.student.lastName}
                        </p>
                        <p>
                          {document.originalName ?? 'Fichier non renseigné'} – déposé le {formatDate(document.submittedAt)}
                        </p>
                      </div>
                      <div className="admin-actions">
                        {document.isDownloadable && (
                          <button type="button" onClick={() => void download(document.id)} aria-label={`Télécharger ${label}`}>
                            Télécharger
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === document.id}
                          aria-label={`Valider ${label}`}
                          onClick={() =>
                            void run(document.id, () => validateAdminDocument(document.id), `${label} : validé.`, 'Validation impossible.')
                          }
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          disabled={busyId === document.id}
                          aria-label={`Refuser ${label}`}
                          onClick={() => setRejection({ kind: 'document', id: document.id, label })}
                        >
                          Refuser
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="admin-card" aria-labelledby="pending-ribs-title">
            <div className="admin-section-heading">
              <h2 id="pending-ribs-title">RIB en attente</h2>
              <span>{data.ribTotal}</span>
            </div>
            {data.ribs.length === 0 ? (
              <p className="admin-empty">Aucun RIB en attente.</p>
            ) : (
              <ul className="admin-list">
                {data.ribs.map((rib) => {
                  const label = `RIB de ${rib.student.firstName} ${rib.student.lastName}`

                  return (
                    <li className="admin-item" key={rib.id}>
                      <div>
                        <strong>{rib.holderName}</strong>
                        <p>
                          {rib.student.code} – {rib.student.firstName} {rib.student.lastName}
                        </p>
                        <p>
                          {rib.bankName} – <span className="mono">{revealedIbans[rib.id] ?? rib.ibanMasked}</span> – soumis le{' '}
                          {formatDate(rib.submittedAt)}
                        </p>
                        <p>RIB actif : {rib.activeRib ? `${rib.activeRib.bankName} – ${rib.activeRib.ibanMasked}` : 'aucun'}</p>
                        {rib.sharedIbanCount > 0 && (
                          <p className="admin-warning">
                            Attention : cet IBAN est aussi déclaré par {rib.sharedIbanCount} autre(s) boursier(s).
                          </p>
                        )}
                      </div>
                      <div className="admin-actions">
                        {!revealedIbans[rib.id] && (
                          <button type="button" disabled={busyId === rib.id} onClick={() => void reveal(rib.id)} aria-label={`Afficher l’IBAN du ${label}`}>
                            Afficher l’IBAN
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === rib.id}
                          aria-label={`Valider le ${label}`}
                          onClick={() => void run(rib.id, () => validateAdminRib(rib.id), `${label} : validé.`, 'Validation impossible.')}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          disabled={busyId === rib.id}
                          aria-label={`Refuser le ${label}`}
                          onClick={() => setRejection({ kind: 'rib', id: rib.id, label })}
                        >
                          Refuser
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <ReasonDialog
        open={rejection !== null}
        title="Motif du refus"
        description={rejection?.label}
        label="Motif communiqué au boursier"
        submitLabel="Refuser"
        onSubmit={confirmRejection}
        onCancel={() => setRejection(null)}
      />
    </div>
  )
}
