import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { ApiError, getMe, logout, type StudentProfile } from './lib/api'
import { CursusPage } from './pages/CursusPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { GeneralPage } from './pages/GeneralPage'
import { LoginPage } from './pages/LoginPage'
import { PaiementsPage } from './pages/PaiementsPage'
import { RibPage } from './pages/RibPage'
import type { PageId } from './types'

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let active = true

    getMe()
      .then((profile) => {
        if (active) {
          setStudent(profile)
        }
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof ApiError && reason.status === 401)) {
          console.error(reason)
        }

        if (active) {
          setStudent(null)
        }
      })
      .finally(() => {
        if (active) {
          setCheckingSession(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (reason) {
      console.error(reason)
    } finally {
      setStudent(null)
      setPage('dashboard')
    }
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onNav={setPage} />
      case 'general': return <GeneralPage />
      case 'cursus': return <CursusPage />
      case 'paiements': return <PaiementsPage />
      case 'rib': return <RibPage />
      case 'documents': return <DocumentsPage />
    }
  }

  if (checkingSession) {
    return (
      <>
        <div className="flag-strip"><span /><span /><span /></div>
        <main className="login-shell">
          <p style={{ color: 'var(--text-3)' }}>Verification de la session...</p>
        </main>
      </>
    )
  }

  if (!student) {
    return <LoginPage onAuthenticated={setStudent} />
  }

  return (
    <>
      <div className="flag-strip"><span /><span /><span /></div>
      <Header student={student} />
      <div className="layout">
        <Sidebar active={page} onNav={setPage} onLogout={handleLogout} />
        <main className="main">
          {renderPage()}
        </main>
      </div>
    </>
  )
}

export default App
