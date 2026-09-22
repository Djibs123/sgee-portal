import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../router'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Portail boursier', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirige vers la connexion sans session valide', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(401, { message: 'Session invalide' }))))

    const router = createMemoryRouter(routes, { initialEntries: ['/portal/paiements'] })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Portail boursier SGEE' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(document.title).toBe('Connexion boursier – Portail SGEE')
  })

  it('affiche le menu et le lien d’évitement avec une session valide', async () => {
    const profile = {
      id: 's1',
      firstName: 'Awa',
      lastName: 'Fall',
      studentNumber: 'STU001',
      nom: 'FALL',
      prenom: 'Awa',
      anneeScolaire: '2025/2026',
      scholarshipStatus: 'ACTIVE',
      statutBourse: 'Active',
    }

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith('/me') || url.endsWith('/student/profile')
            ? jsonResponse(200, profile)
            : jsonResponse(200, { items: [] }),
        ),
      ),
    )

    const router = createMemoryRouter(routes, { initialEntries: ['/portal/dossier'] })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('navigation', { name: 'Menu du portail boursier' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('button', { name: 'Ouvrir le menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(await screen.findByRole('heading', { name: 'Informations générales' })).toBeInTheDocument()
  })

  it('affiche une page introuvable dans le portail', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(200, { firstName: 'A', lastName: 'B', items: [] }))))

    const router = createMemoryRouter(routes, { initialEntries: ['/portal/inexistant'] })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour au tableau de bord' })).toBeInTheDocument()
  })
})
