import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import {
  cancelStudentDocumentSubmission,
  downloadStudentDocument,
  getStudentDocuments,
  uploadStudentDocument,
  type StudentDocument,
} from '../lib/api'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
])

const OTHER_DOCUMENT_OPTION = {
  value: 'free:AUTRE',
  type: 'AUTRE',
  label: 'Autre',
}

function isMissing(document: StudentDocument) {
  return document.status === 'REQUIRED'
}

function getDocumentStatusClass(document: StudentDocument) {
  switch (document.status) {
    case 'PENDING':
      return 'pending'
    case 'VALIDATED':
      return 'validated'
    case 'REJECTED':
      return 'rejected'
    case 'REQUIRED':
      return 'required'
  }
}

type UploadDocumentOption = {
  value: string
  type: string
  label: string
  documentId?: string
}

type DocumentsPageProps = {
  onRequiredDocumentsCountChange?: (count: number) => void
}

type Feedback = {
  type: 'success' | 'error'
  message: string
} | null

function getRequiredDocumentsCount(documents: StudentDocument[]) {
  return documents.filter((document) => document.status === 'REQUIRED').length
}

export function DocumentsPage({
  onRequiredDocumentsCountChange,
}: DocumentsPageProps) {
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedOption, setSelectedOption] = useState(OTHER_DOCUMENT_OPTION.value)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<Feedback>(null)
  const [downloadError, setDownloadError] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const uploadOptions = useMemo<UploadDocumentOption[]>(() => {
    const options = documents
      .filter((document) => document.status === 'REQUIRED')
      .map((document) => ({
        value: `document:${document.id}`,
        type: document.type,
        label: document.nom,
        documentId: document.id,
      }))

    return [...options, OTHER_DOCUMENT_OPTION]
  }, [documents])
  const selectedDocumentOption =
    uploadOptions.find((option) => option.value === selectedOption) ??
    uploadOptions[0] ??
    OTHER_DOCUMENT_OPTION

  const applyDocuments = useCallback((items: StudentDocument[]) => {
    setDocuments(items)
    onRequiredDocumentsCountChange?.(getRequiredDocumentsCount(items))
  }, [onRequiredDocumentsCountChange])

  const clearUploadFeedback = () => {
    setUploadFeedback(null)
  }

  useEffect(() => {
    let ignore = false

    async function loadDocuments() {
      try {
        setLoading(true)
        setError(null)
        const response = await getStudentDocuments()

        if (!ignore) {
          applyDocuments(response.items)
        }
      } catch (requestError) {
        if (!ignore) {
          setError(
            requestError instanceof Error
              ? requestError
              : new Error('Documents unavailable'),
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadDocuments()

    return () => {
      ignore = true
    }
  }, [applyDocuments])

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    clearUploadFeedback()
    setSelectedFile(file)
  }

  const uploadDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget

    clearUploadFeedback()

    if (!selectedFile) {
      setUploadFeedback({
        type: 'error',
        message: "Selectionnez un fichier a envoyer",
      })
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadFeedback({
        type: 'error',
        message: 'Le fichier depasse la taille autorisee',
      })
      return
    }

    if (!ALLOWED_FILE_TYPES.has(selectedFile.type)) {
      setUploadFeedback({
        type: 'error',
        message: 'Type de fichier non autorise',
      })
      return
    }

    const formData = new FormData()

    formData.append('type', selectedDocumentOption.type)
    formData.append('label', selectedDocumentOption.label)

    if (selectedDocumentOption.documentId) {
      formData.append('documentId', selectedDocumentOption.documentId)
    }

    formData.append('file', selectedFile)

    setUploading(true)

    try {
      await uploadStudentDocument(formData)
    } catch {
      setUploadFeedback({
        type: 'error',
        message: "Impossible d'ajouter le document",
      })
      setUploading(false)
      return
    }

    setUploadFeedback({
      type: 'success',
      message: 'Document envoyé avec succès. En attente de validation.',
    })

    try {
      const response = await getStudentDocuments()

      applyDocuments(response.items)
    } catch (refreshError) {
      console.error(
        'Document envoyé, mais rafraîchissement impossible',
        refreshError,
      )
    }

    try {
      setSelectedFile(null)
      form.reset()
    } catch (resetError) {
      console.error('Document envoyé, mais reset du formulaire impossible', resetError)
    } finally {
      setUploading(false)
    }
  }

  const downloadDocument = async (document: StudentDocument) => {
    setDownloadError('')
    setDownloadingId(document.id)

    try {
      const download = await downloadStudentDocument(document.id)
      const url = URL.createObjectURL(download.blob)
      const link = window.document.createElement('a')

      link.href = url
      link.download = download.fileName
      window.document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setDownloadError('Impossible de telecharger ce document')
    } finally {
      setDownloadingId(null)
    }
  }

  const cancelSubmission = async (document: StudentDocument) => {
    const confirmed = window.confirm(
      'Annuler ce depot ? Vous pourrez envoyer un nouveau fichier.',
    )

    if (!confirmed) {
      return
    }

    setCancelingId(document.id)
    setUploadFeedback(null)

    try {
      const response = await cancelStudentDocumentSubmission(document.id)

      applyDocuments(response.items)
      setUploadFeedback({
        type: 'success',
        message: 'Depot annule',
      })
    } catch {
      setUploadFeedback({
        type: 'error',
        message: "Impossible d'annuler le depot",
      })
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Documents" />
        <h1>Documents</h1>
        <p>Pieces justificatives de votre dossier</p>
      </div>

      <InlineState loading={loading} error={error} />
      {downloadError && (
        <p style={{ color: 'var(--red-sn)', fontSize: '13px', marginBottom: '12px' }}>
          {downloadError}
        </p>
      )}

      <form className="card" onSubmit={uploadDocument} style={{ marginBottom: '14px' }}>
        <div className="info-section-title">Ajouter un document</div>
        <div className="info-grid">
          <label className="info-field">
            <span>Type de document</span>
            <select
              value={selectedDocumentOption.value}
              onChange={(event) => {
                clearUploadFeedback()
                setSelectedOption(event.target.value)
              }}
            >
              {uploadOptions.map((documentOption) => (
                <option key={documentOption.value} value={documentOption.value}>
                  {documentOption.label}
                </option>
              ))}
            </select>
          </label>
          <label className="info-field">
            <span>Fichier</span>
            <input type="file" accept=".pdf,image/png,image/jpeg" onChange={selectFile} />
          </label>
        </div>

        {uploadFeedback?.type === 'error' ? (
          <p style={{ color: 'var(--red-sn)', fontSize: '13px', marginTop: '12px' }}>{uploadFeedback.message}</p>
        ) : uploadFeedback?.type === 'success' ? (
          <p style={{ color: 'var(--green)', fontSize: '13px', fontWeight: 700, marginTop: '12px' }}>{uploadFeedback.message}</p>
        ) : null}

        <div style={{ marginTop: '14px' }}>
          <button className="copy-btn" type="submit" disabled={uploading}>
            {uploading ? 'Envoi...' : 'Ajouter un document'}
          </button>
        </div>
      </form>

      <div style={{ display: 'grid', gap: '10px' }}>
        {documents.map((document, i) => {
          const missing = isMissing(document)
          const statusClass = getDocumentStatusClass(document)

          return (
            <div key={document.id ?? `${document.type}-${i}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8,
                background: missing ? 'oklch(0.97 0.06 80)' : 'var(--green-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: missing ? 'oklch(0.50 0.15 70)' : 'var(--green)',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{document.nom}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                  {document.dateDepot ? `Depose le ${document.dateDepot}` : 'Document requis'}
                </div>
              </div>
              <span className={`status-pill ${statusClass}`} style={{ fontSize: '11px' }}>
                {document.statusLabel}
              </span>
              {document.isDownloadable && (
                <button
                  className="copy-btn"
                  type="button"
                  onClick={() => void downloadDocument(document)}
                  disabled={downloadingId === document.id}
                >
                  {downloadingId === document.id ? 'Telechargement...' : 'Telecharger'}
                </button>
              )}
              {document.status === 'PENDING' && (
                <button
                  className="copy-btn"
                  type="button"
                  onClick={() => void cancelSubmission(document)}
                  disabled={cancelingId === document.id}
                >
                  {cancelingId === document.id ? 'Annulation...' : 'Annuler'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
