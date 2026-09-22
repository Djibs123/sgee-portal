import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../Sidebar'
import { ConfirmDialog } from './ConfirmDialog'
import { Dialog } from './Dialog'
import { ReasonDialog } from './ReasonDialog'
import { StatusMessage } from './StatusMessage'

describe('Dialog', () => {
  it('expose un titre accessible et se ferme avec Échap (événement close)', () => {
    const onClose = vi.fn()

    render(
      <Dialog open title="Confirmer" description="Une description" onClose={onClose}>
        <p>Contenu</p>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Confirmer' })

    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveAccessibleDescription('Une description')

    fireEvent(dialog, new Event('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ConfirmDialog', () => {
  it('déclenche la confirmation ou l’annulation', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open
        title="Annuler le dépôt ?"
        message="Le fichier sera supprimé."
        confirmLabel="Annuler le dépôt"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Annuler le dépôt' }))
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('ReasonDialog', () => {
  it('exige un motif suffisant et renvoie le texte nettoyé', async () => {
    const onSubmit = vi.fn()

    render(
      <ReasonDialog
        open
        title="Refuser le document"
        label="Motif du refus"
        submitLabel="Refuser"
        minLength={5}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    const field = screen.getByLabelText('Motif du refus')

    await userEvent.type(field, 'non')
    await userEvent.click(screen.getByRole('button', { name: 'Refuser' }))

    expect(screen.getByRole('alert')).toHaveTextContent('au moins 5 caractères')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.type(field, ' lisible  ')
    await userEvent.click(screen.getByRole('button', { name: 'Refuser' }))

    expect(onSubmit).toHaveBeenCalledWith('non lisible')
  })
})

describe('StatusMessage', () => {
  it('utilise une région d’alerte pour les erreurs et de statut sinon', () => {
    const { rerender } = render(<StatusMessage tone="error" message="Échec" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Échec')

    rerender(<StatusMessage tone="success" message="Enregistré" />)
    expect(screen.getByRole('status')).toHaveTextContent('Enregistré')
  })
})

describe('Sidebar', () => {
  it('signale la page courante et annonce les badges', () => {
    render(
      <MemoryRouter initialEntries={['/portal/rib']}>
        <Sidebar open={false} onNavigate={vi.fn()} onLogout={vi.fn()} requiredDocumentsCount={2} />
      </MemoryRouter>,
    )

    const navigation = screen.getByRole('navigation', { name: 'Menu du portail boursier' })

    expect(navigation).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Coordonnées bancaires' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: /Documents.*2 document\(s\) à fournir/ })).toBeInTheDocument()
  })
})
