import { useState } from 'react'
import {
  downloadRequestDocument,
  getApiErrorMessage,
  removeRequestDocument,
  saveDownloadedFile,
  uploadRequestDocument,
  type RequestSpace,
  type RequestView,
} from '../../lib/api'
import { validateFile } from '../../lib/files'
import { formatDate } from '../../lib/format'
import { toneOfStatus } from '../../lib/status'
import { FileField } from '../ui/FileField'
import { StatusMessage } from '../ui/StatusMessage'
import { StatusPill } from '../ui/StatusPill'

type RequestDocumentsProps = {
  space: RequestSpace
  request: RequestView
  onChange: (request: RequestView) => void
}

/** Pièces attendues pour le niveau visé : dépôt, remplacement, suppression, téléchargement. */
export function RequestDocuments({ space, request, onChange }: RequestDocumentsProps) {
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [fieldKeys, setFieldKeys] = useState<Record<string, number>>({})
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const editable = request.isEditable

  const upload = async (code: string, label: string) => {
    const file = files[code] ?? null
    const validationError = validateFile(file)

    setErrors((current) => ({ ...current, [code]: validationError }))

    if (validationError || !file) {
      return
    }

    setBusyCode(code)
    setFeedback(null)

    try {
      onChange(await uploadRequestDocument(space, request.id, code, file))
      setFiles((current) => ({ ...current, [code]: null }))
      setFieldKeys((current) => ({ ...current, [code]: (current[code] ?? 0) + 1 }))
      setFeedback({ tone: 'success', message: `« ${label} » déposé.` })
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Envoi impossible.') })
    } finally {
      setBusyCode(null)
    }
  }

  const remove = async (code: string, documentId: string, label: string) => {
    setBusyCode(code)
    setFeedback(null)

    try {
      onChange(await removeRequestDocument(space, request.id, documentId))
      setFeedback({ tone: 'success', message: `« ${label} » retiré.` })
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Suppression impossible.') })
    } finally {
      setBusyCode(null)
    }
  }

  const download = async (documentId: string) => {
    try {
      saveDownloadedFile(await downloadRequestDocument(space, request.id, documentId))
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Téléchargement impossible.') })
    }
  }

  if (request.documents.length === 0) {
    return <p>Choisissez d’abord le niveau demandé : la liste des pièces en dépend.</p>
  }

  return (
    <div>
      <StatusMessage tone={feedback?.tone ?? 'success'} message={feedback?.message} />
      <ul className="document-list" aria-label="Pièces justificatives">
        {request.documents.map((document) => {
          const canUpload = editable && document.status !== 'VALIDATED'

          return (
            <li key={document.documentTypeCode} className="card document-row">
              <div className="document-main">
                <p className="document-name">
                  {document.label}
                  {document.required ? ' (obligatoire)' : ' (facultatif)'}
                </p>
                {document.description && <p className="document-meta">{document.description}</p>}
                {document.originalName && (
                  <p className="document-meta">
                    {document.originalName}
                    {document.submittedAt ? ` – déposé le ${formatDate(document.submittedAt)}` : ''}
                  </p>
                )}
                {document.reviewComment && (
                  <p className="document-comment">Remarque du SGEE : {document.reviewComment}</p>
                )}
              </div>
              <StatusPill tone={toneOfStatus(document.status)}>{document.statusLabel}</StatusPill>
              <div className="document-actions">
                {document.id && document.isDownloadable && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void download(document.id!)}
                    aria-label={`Télécharger ${document.label}`}
                  >
                    Télécharger
                  </button>
                )}
                {canUpload && document.id && document.isDownloadable && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busyCode === document.documentTypeCode}
                    onClick={() => void remove(document.documentTypeCode, document.id!, document.label)}
                    aria-label={`Retirer ${document.label}`}
                  >
                    Retirer
                  </button>
                )}
              </div>
              {canUpload && (
                <div className="document-upload">
                  <FileField
                    key={fieldKeys[document.documentTypeCode] ?? 0}
                    label={document.isDownloadable ? `Remplacer : ${document.label}` : `Fichier : ${document.label}`}
                    error={errors[document.documentTypeCode]}
                    disabled={busyCode === document.documentTypeCode}
                    onChange={(file) => {
                      setFiles((current) => ({ ...current, [document.documentTypeCode]: file }))
                      setErrors((current) => ({ ...current, [document.documentTypeCode]: null }))
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busyCode === document.documentTypeCode}
                    onClick={() => void upload(document.documentTypeCode, document.label)}
                    aria-label={`Envoyer ${document.label}`}
                  >
                    {busyCode === document.documentTypeCode ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
