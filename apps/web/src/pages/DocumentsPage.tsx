import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import {
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

const documentTypes = [
  { value: 'CERTIFICAT_SCOLARITE', label: 'Certificat de scolarite' },
  { value: 'PIECE_IDENTITE', label: "Piece d'identite" },
  { value: 'RIB', label: 'RIB' },
  { value: 'AUTRE', label: 'Autre' },
]

function isMissing(document: StudentDocument) {
  return document.statut === 'MISSING'
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedType, setSelectedType] = useState(documentTypes[0].value)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadDocuments() {
      try {
        setLoading(true)
        setError(null)
        const response = await getStudentDocuments()

        if (!ignore) {
          setDocuments(response.items)
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
  }, [])

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    setUploadError('')
    setUploadSuccess('')
    setSelectedFile(file)
  }

  const uploadDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploadError('')
    setUploadSuccess('')

    if (!selectedFile) {
      setUploadError("Selectionnez un fichier a envoyer")
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadError('Le fichier depasse la taille autorisee')
      return
    }

    if (!ALLOWED_FILE_TYPES.has(selectedFile.type)) {
      setUploadError('Type de fichier non autorise')
      return
    }

    const documentLabel =
      documentTypes.find((documentType) => documentType.value === selectedType)
        ?.label ?? 'Document'
    const formData = new FormData()

    formData.append('type', selectedType)
    formData.append('label', documentLabel)
    formData.append('file', selectedFile)

    try {
      setUploading(true)
      const createdDocument = await uploadStudentDocument(formData)

      setDocuments((current) => [createdDocument, ...current])
      setSelectedFile(null)
      setUploadSuccess('Document ajoute')
      event.currentTarget.reset()
    } catch {
      setUploadError("Impossible d'ajouter le document")
    } finally {
      setUploading(false)
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

      <form className="card" onSubmit={uploadDocument} style={{ marginBottom: '14px' }}>
        <div className="info-section-title">Ajouter un document</div>
        <div className="info-grid">
          <label className="info-field">
            <span>Type de document</span>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              {documentTypes.map((documentType) => (
                <option key={documentType.value} value={documentType.value}>
                  {documentType.label}
                </option>
              ))}
            </select>
          </label>
          <label className="info-field">
            <span>Fichier</span>
            <input type="file" accept=".pdf,image/png,image/jpeg" onChange={selectFile} />
          </label>
        </div>

        {uploadError && <p style={{ color: 'var(--red-sn)', fontSize: '13px', marginTop: '12px' }}>{uploadError}</p>}
        {uploadSuccess && <p style={{ color: 'var(--green)', fontSize: '13px', fontWeight: 700, marginTop: '12px' }}>{uploadSuccess}</p>}

        <div style={{ marginTop: '14px' }}>
          <button className="copy-btn" type="submit" disabled={uploading}>
            {uploading ? 'Envoi...' : 'Ajouter un document'}
          </button>
        </div>
      </form>

      <div style={{ display: 'grid', gap: '10px' }}>
        {documents.map((document, i) => {
          const missing = isMissing(document)

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
                  {document.dateDepot ? `Fourni le ${document.dateDepot}` : 'Document requis'}
                </div>
              </div>
              <span className={`status-pill ${missing ? 'suspendu' : 'actif'}`} style={{ fontSize: '11px' }}>
                {missing ? 'Requis' : 'Fourni'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
