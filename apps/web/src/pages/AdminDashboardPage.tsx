import { useCallback, useEffect, useState } from 'react'
import {
  adminLogout,
  downloadAdminDocument,
  getAdminPendingDocuments,
  getAdminPendingRibs,
  rejectAdminDocument,
  rejectAdminRib,
  validateAdminDocument,
  validateAdminRib,
  type AdminPendingDocument,
  type AdminPendingRib,
  type AdminProfile,
} from '../lib/api'

type AdminDashboardPageProps = {
  admin: AdminProfile
  onLogout: () => void
}

type Feedback = {
  type: 'success' | 'error'
  message: string
} | null

export function AdminDashboardPage({
  admin,
  onLogout,
}: AdminDashboardPageProps) {
  const [documents, setDocuments] = useState<AdminPendingDocument[]>([])
  const [ribs, setRibs] = useState<AdminPendingRib[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadPendingItems = useCallback(async () => {
    const [documentsResponse, ribsResponse] = await Promise.all([
      getAdminPendingDocuments(),
      getAdminPendingRibs(),
    ])

    setDocuments(documentsResponse.items)
    setRibs(ribsResponse.items)
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitialPendingItems() {
      const [documentsResponse, ribsResponse] = await Promise.all([
        getAdminPendingDocuments(),
        getAdminPendingRibs(),
      ])

      if (active) {
        setDocuments(documentsResponse.items)
        setRibs(ribsResponse.items)
      }
    }

    loadInitialPendingItems()
      .catch((reason: unknown) => {
        console.error(reason)

        if (active) {
          setFeedback({
            type: 'error',
            message: 'Impossible de charger les validations en attente',
          })
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [loadPendingItems])

  const refreshAfterAction = async (message: string) => {
    await loadPendingItems()
    setFeedback({
      type: 'success',
      message,
    })
  }

  const logout = async () => {
    try {
      await adminLogout()
    } catch (reason) {
      console.error(reason)
    } finally {
      onLogout()
    }
  }

  const downloadDocument = async (document: AdminPendingDocument) => {
    setFeedback(null)
    setBusyId(document.id)

    try {
      const download = await downloadAdminDocument(document.id)
      const url = URL.createObjectURL(download.blob)
      const link = window.document.createElement('a')

      link.href = url
      link.download = download.fileName
      window.document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setFeedback({
        type: 'error',
        message: 'Impossible de telecharger ce document',
      })
    } finally {
      setBusyId(null)
    }
  }

  const validateDocument = async (document: AdminPendingDocument) => {
    setFeedback(null)
    setBusyId(document.id)

    try {
      await validateAdminDocument(document.id)
      await refreshAfterAction('Document valide')
    } catch {
      setFeedback({
        type: 'error',
        message: 'Impossible de valider ce document',
      })
    } finally {
      setBusyId(null)
    }
  }

  const rejectDocument = async (document: AdminPendingDocument) => {
    const reviewComment = window.prompt('Motif du refus')

    if (!reviewComment) {
      return
    }

    setFeedback(null)
    setBusyId(document.id)

    try {
      await rejectAdminDocument(document.id, reviewComment)
      await refreshAfterAction('Document refuse')
    } catch {
      setFeedback({
        type: 'error',
        message: 'Impossible de refuser ce document',
      })
    } finally {
      setBusyId(null)
    }
  }

  const validateRib = async (rib: AdminPendingRib) => {
    setFeedback(null)
    setBusyId(rib.id)

    try {
      await validateAdminRib(rib.id)
      await refreshAfterAction('RIB valide')
    } catch {
      setFeedback({
        type: 'error',
        message: 'Impossible de valider ce RIB',
      })
    } finally {
      setBusyId(null)
    }
  }

  const rejectRib = async (rib: AdminPendingRib) => {
    const reviewComment = window.prompt('Motif du refus')

    if (!reviewComment) {
      return
    }

    setFeedback(null)
    setBusyId(rib.id)

    try {
      await rejectAdminRib(rib.id, reviewComment)
      await refreshAfterAction('RIB refuse')
    } catch {
      setFeedback({
        type: 'error',
        message: 'Impossible de refuser ce RIB',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="flag-strip"><span /><span /><span /></div>
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <strong>Administration SGEE</strong>
            <span>Validations documents et RIB</span>
          </div>
          <div className="admin-header-actions">
            <span>{admin.name}</span>
            <button type="button" onClick={logout}>Deconnexion</button>
          </div>
        </header>

        <main className="admin-main">
          <div className="admin-page-title">
            <h1>Validations en attente</h1>
            <p>Traitez les documents et coordonnees bancaires soumis par les boursiers.</p>
          </div>

          {feedback?.type === 'error' ? (
            <p className="admin-feedback error">{feedback.message}</p>
          ) : feedback?.type === 'success' ? (
            <p className="admin-feedback success">{feedback.message}</p>
          ) : null}

          {loading ? (
            <div className="admin-card">Chargement des validations...</div>
          ) : (
            <>
              <section className="admin-card">
                <div className="admin-section-heading">
                  <h2>Documents en attente</h2>
                  <span>{documents.length}</span>
                </div>

                <div className="admin-list">
                  {documents.length === 0 ? (
                    <p className="admin-empty">Aucun document en attente.</p>
                  ) : documents.map((document) => (
                    <article className="admin-item" key={document.id}>
                      <div>
                        <strong>{document.nom}</strong>
                        <p>
                          {document.student.code} - {document.student.firstName} {document.student.lastName}
                        </p>
                        <p>{document.originalName ?? 'Fichier non renseigne'} - {document.submittedAtLabel || 'Date non renseignee'}</p>
                      </div>
                      <div className="admin-actions">
                        {document.isDownloadable && (
                          <button
                            type="button"
                            onClick={() => void downloadDocument(document)}
                            disabled={busyId === document.id}
                          >
                            Telecharger
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void validateDocument(document)}
                          disabled={busyId === document.id}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          onClick={() => void rejectDocument(document)}
                          disabled={busyId === document.id}
                        >
                          Refuser
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-section-heading">
                  <h2>RIB en attente</h2>
                  <span>{ribs.length}</span>
                </div>

                <div className="admin-list">
                  {ribs.length === 0 ? (
                    <p className="admin-empty">Aucun RIB en attente.</p>
                  ) : ribs.map((rib) => (
                    <article className="admin-item" key={rib.id}>
                      <div>
                        <strong>{rib.holderName}</strong>
                        <p>
                          {rib.student.code} - {rib.student.firstName} {rib.student.lastName}
                        </p>
                        <p>{rib.bankName} - {rib.ibanMasked || rib.iban} - {rib.submittedAtLabel || 'Date non renseignee'}</p>
                      </div>
                      <div className="admin-actions">
                        <button
                          type="button"
                          onClick={() => void validateRib(rib)}
                          disabled={busyId === rib.id}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          onClick={() => void rejectRib(rib)}
                          disabled={busyId === rib.id}
                        >
                          Refuser
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </>
  )
}
