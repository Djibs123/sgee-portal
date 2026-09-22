import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { getStudentDocuments } from '../lib/api'
import { useStudentSession } from '../session/sessions'
import { FullPageMessage } from './FullPageMessage'
import { SkipLink } from './SkipLink'

export type PortalOutletContext = {
  setRequiredDocumentsCount: (count: number) => void
}

/** Espace boursier : accès réservé aux sessions boursier valides. */
export function PortalLayout() {
  const { profile, status, expired, signOut } = useStudentSession()
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [requiredDocumentsCount, setRequiredDocumentsCount] = useState(0)

  useEffect(() => {
    if (!profile) {
      return
    }

    let active = true

    getStudentDocuments()
      .then((response) => {
        if (active) {
          setRequiredDocumentsCount(
            response.items.filter((document) => ['REQUIRED', 'REJECTED'].includes(document.status)).length,
          )
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [profile])

  // Après une navigation, le focus va au contenu : le lecteur d'écran n'est pas perdu dans le menu.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    mainRef.current?.focus()
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  if (status === 'loading') {
    return <FullPageMessage>Vérification de la session…</FullPageMessage>
  }

  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname, expired }} />
  }

  const logout = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <>
      <SkipLink />
      <div className="flag-strip" aria-hidden="true"><span /><span /><span /></div>
      <Header student={profile} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((open) => !open)} />
      <div className="layout">
        <Sidebar
          open={menuOpen}
          onNavigate={() => setMenuOpen(false)}
          onLogout={() => void logout()}
          requiredDocumentsCount={requiredDocumentsCount}
        />
        {menuOpen && <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
        <main id="main-content" ref={mainRef} tabIndex={-1} className="main">
          <Outlet context={{ setRequiredDocumentsCount } satisfies PortalOutletContext} />
        </main>
      </div>
    </>
  )
}
