import { render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from './AppError'

function renderFailing(error: Error) {
  const Boom = () => {
    throw error
  }

  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ element: <Outlet />, errorElement: <AppError />, children: [{ path: '/', element: <Boom /> }] }],
        { initialEntries: ['/'] },
      )}
    />,
  )
}

describe('AppError', () => {
  beforeEach(() => {
    // React journalise l'erreur interceptée : inutile de polluer la sortie des tests.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('remplace la page blanche par un écran utilisable', () => {
    renderFailing(new Error('rendu impossible'))

    expect(screen.getByRole('heading', { name: 'Une erreur est survenue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/')
  })

  it('reconnaît un fragment devenu introuvable après un déploiement', () => {
    renderFailing(new Error('Failed to fetch dynamically imported module: /assets/admin-abc.js'))

    expect(screen.getByRole('heading', { name: 'Une nouvelle version est disponible' })).toBeInTheDocument()
  })
})
