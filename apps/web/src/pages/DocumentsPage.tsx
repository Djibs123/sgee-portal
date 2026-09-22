import { useId, useRef, useState, type FormEvent } from 'react'
import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { FileField } from '../components/ui/FileField'
import { StatusMessage } from '../components/ui/StatusMessage'
import { StatusPill } from '../components/ui/StatusPill'
import { usePortalContext } from '../layouts/usePortalContext'
import {
  cancelStudentDocumentSubmission,
  downloadStudentDocument,
  getApiErrorMessage,
  getDocumentTypes,
  getStudentDocuments,
  saveDownloadedFile,
  uploadStudentDocument,
  type StudentDocument,
} from '../lib/api'
import { validateFile } from '../lib/files'
import { toneOfStatus } from '../lib/status'
import { useApiResource } from '../lib/useApiResource'
import { useDocumentTitle } from '../lib/useDocumentTitle'

type Feedback = { tone: 'success' | 'error'; message: string } | null

/** Pièces attendues par le SGEE : jamais déposées ou refusées (à remplacer). */
const needsFile = (document: StudentDocument) =>
  document.status === 'REQUIRED' || document.status === 'REJECTED'

export function DocumentsPage() {
  useDocumentTitle('Documents')

  const { setRequiredDocumentsCount } = usePortalContext()
  const { data, loading, error, setData } = useApiResource(getStudentDocuments)
  const { data: types } = useApiResource(getDocumentTypes)
  const [target, setTarget] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileFieldKey, setFileFieldKey] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<StudentDocument | null>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const selectId = useId()

  const documents = data?.items ?? []
  const toProvide = documents.filter(needsFile)
  const options = [
    ...toProvide.map((document) => ({
      value: `doc:${document.id}`,
      label: document.status === 'REJECTED' ? `${document.nom} (à remplacer)` : document.nom,
    })),
    ...(types?.items ?? []).map((type) => ({ value: `type:${type.code}`, label: `Autre pièce : ${type.label}` })),
  ]
  const selected = options.some((option) => option.value === target) ? target : (options[0]?.value ?? '')

  const applyDocuments = (items: StudentDocument[]) => {
    setData({ items })
    setRequiredDocumentsCount(items.filter(needsFile).length)
  }

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    const validationError = validateFile(file)

    setFileError(validationError)

    if (validationError || !file || !selected) {
      return
    }

    const formData = new FormData()
    const [kind, value] = selected.split(':')

    if (kind === 'doc') {
      const document = documents.find((item) => item.id === value)

      formData.append('documentId', value)
      formData.append('type', document?.type ?? 'AUTRE')
      formData.append('label', document?.nom ?? '')
    } else {
      formData.append('type', value)
      formData.append('label', types?.items.find((type) => type.code === value)?.label ?? '')
    }

    formData.append('file', file)
    setUploading(true)

    try {
      await uploadStudentDocument(formData)
      applyDocuments((await getStudentDocuments()).items)
      setFeedback({ tone: 'success', message: 'Document envoyé. Il est en attente de validation par le SGEE.' })
      setFile(null)
      setTarget('')
      setFileFieldKey((key) => key + 1)
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Impossible d’envoyer le document.') })
    } finally {
      setUploading(false)
    }
  }

  const prepareReplacement = (document: StudentDocument) => {
    setTarget(`doc:${document.id}`)
    setFeedback(null)
    selectRef.current?.focus()
    selectRef.current?.scrollIntoView({ block: 'center' })
  }

  const download = async (document: StudentDocument) => {
    setBusyId(document.id)
    setFeedback(null)

    try {
      saveDownloadedFile(await downloadStudentDocument(document.id))
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Téléchargement impossible.') })
    } finally {
      setBusyId(null)
    }
  }

  const confirmCancellation = async () => {
    if (!cancelTarget) {
      return
    }

    setBusyId(cancelTarget.id)

    try {
      applyDocuments((await cancelStudentDocumentSubmission(cancelTarget.id)).items)
      setFeedback({ tone: 'success', message: 'Dépôt annulé.' })
    } catch (reason) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(reason, 'Impossible d’annuler le dépôt.') })
    } finally {
      setBusyId(null)
      setCancelTarget(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Documents" />
        <h1>Documents</h1>
        <p>Pièces justificatives de votre dossier de bourse</p>
      </div>

      <InlineState loading={loading} error={error} />

      <form className="card" onSubmit={upload} style={{ marginBottom: '14px' }} noValidate aria-labelledby="upload-title">
        <h2 id="upload-title" className="info-section-title">Déposer un document</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor={selectId}>Pièce concernée</label>
            <select
              id={selectId}
              ref={selectRef}
              value={selected}
              onChange={(event) => {
                setTarget(event.target.value)
                setFeedback(null)
              }}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <FileField
            key={fileFieldKey}
            label="Fichier"
            error={fileError}
            disabled={uploading}
            onChange={(nextFile) => {
              setFile(nextFile)
              setFileError(null)
            }}
          />
        </div>

        <StatusMessage tone={feedback?.tone ?? 'success'} message={feedback?.message} />

        <button className="btn btn-primary" type="submit" disabled={uploading || !selected}>
          {uploading ? 'Envoi…' : 'Envoyer le document'}
        </button>
      </form>

      {data && documents.length === 0 && <EmptyState title="Aucun document pour le moment" />}

      <ul className="document-list" aria-label="Mes documents">
        {documents.map((document) => (
          <li key={document.id} className="card document-row">
            <div className="document-main">
              <p className="document-name">{document.nom}</p>
              <p className="document-meta">
                {document.dateDepot ? `Déposé le ${document.dateDepot}` : 'Pas encore déposé'}
                {document.obligatoire ? ' – obligatoire' : ''}
              </p>
              {document.status === 'REJECTED' && document.reviewComment && (
                <p className="document-comment">Motif du refus : {document.reviewComment}</p>
              )}
            </div>
            <StatusPill tone={toneOfStatus(document.status)}>{document.statusLabel}</StatusPill>
            <div className="document-actions">
              {document.isDownloadable && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void download(document)}
                  disabled={busyId === document.id}
                  aria-label={`Télécharger ${document.nom}`}
                >
                  Télécharger
                </button>
              )}
              {needsFile(document) && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => prepareReplacement(document)}
                  aria-label={`${document.status === 'REJECTED' ? 'Remplacer' : 'Déposer'} ${document.nom}`}
                >
                  {document.status === 'REJECTED' ? 'Remplacer' : 'Déposer'}
                </button>
              )}
              {document.status === 'PENDING' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCancelTarget(document)}
                  disabled={busyId === document.id}
                  aria-label={`Annuler le dépôt ${document.nom}`}
                >
                  Annuler le dépôt
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Annuler ce dépôt ?"
        message={`Le fichier envoyé pour « ${cancelTarget?.nom ?? ''} » sera supprimé. Vous pourrez en déposer un nouveau.`}
        confirmLabel="Annuler le dépôt"
        tone="danger"
        busy={busyId !== null && busyId === cancelTarget?.id}
        onConfirm={() => void confirmCancellation()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}
