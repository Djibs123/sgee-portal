import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../router'

const normalize = (value: string | null) => (value ?? '').replace(/\s/g, ' ')

const profile = { id: 's1', firstName: 'Awa', lastName: 'Fall', studentNumber: 'STU001' }

const dashboard = {
  student: {
    firstName: 'Awa',
    lastName: 'Fall',
    studentNumber: 'STU001',
    matricule: '123',
    level: 'Licence 3',
    levelCode: 'L3',
    field: 'Informatique',
    academy: 'Nancy',
    country: 'France',
    academicYear: '2025/2026',
  },
  scholarship: {
    status: 'ACTIVE',
    statusLabel: 'Active',
    type: 'Bourse 1er et 2nd cycle',
    paymentMethod: 'Virement-France',
    startDate: '2023-10-01T00:00:00.000Z',
    endDate: '2028-07-31T00:00:00.000Z',
    progressPercent: 62,
    monthlyAllocation: '221.05',
    monthlyAllocationCfa: 145000,
    currency: 'EUR',
    attributionNumber: null,
  },
  payments: {
    currentYearCount: 2,
    currentYearTotal: '594.54',
    currency: 'EUR',
    last: { month: 'Avril', academicYear: '2025/2026', amount: '297.27', currency: 'EUR', paidAt: '2026-04-01T00:00:00.000Z' },
    nextEstimatedAt: '2026-05-01T00:00:00.000Z',
  },
  documents: { toProvide: [{ id: 'd1', name: 'Relevé de notes S5', status: 'REQUIRED', reviewComment: null }] },
  rib: { active: { bankName: 'BNP', ibanMasked: 'FR76 **** 0143' }, hasPendingChange: false },
  renewal: {
    campaign: {
      id: 'c1',
      type: 'RENEWAL',
      title: 'Renouvellement 2026/2027',
      instructions: null,
      academicYear: { id: 'y1', code: '2026-2027', label: '2026/2027' },
      opensAt: '2026-09-01T00:00:00.000Z',
      closesAt: '2027-01-01T00:00:00.000Z',
      closedAt: null,
      maxAgeNonDoctoral: null,
      phase: 'OPEN',
      phaseLabel: 'Ouverte',
      requirements: [],
    },
    request: null,
    eligibility: { eligible: true, blockers: [], warnings: [] },
  },
  notifications: { unreadCount: 0, latest: [] },
}

const documents = {
  items: [
    { id: 'd1', nom: 'Relevé de notes S5', type: 'RELEVE_NOTES', status: 'REJECTED', statusLabel: 'Refusé', obligatoire: true, dateDepot: '01/04/2026', reviewComment: 'Illisible', isDownloadable: true },
    { id: 'd2', nom: 'Certificat 2025/2026', type: 'CERTIFICAT_SCOLARITE', status: 'PENDING', statusLabel: 'En attente de validation', obligatoire: true, dateDepot: '02/04/2026', reviewComment: null, isDownloadable: true },
  ],
}

function mockApi(overrides: Record<string, unknown> = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const path = url.replace(/^.*\/api/, '').split('?')[0]
    const method = init?.method ?? 'GET'
    const routesTable: Record<string, unknown> = {
      'GET /me': profile,
      'GET /student/dashboard': dashboard,
      'GET /student/documents': documents,
      'GET /student/document-types': { items: [{ code: 'AUTRE', label: 'Autre justificatif', description: null }] },
      'GET /student/notifications': { items: [], unreadCount: 0, page: 1, pageSize: 1, total: 0 },
      'GET /student/payments': {
        items: [
          { mois: 'Avril', annee: '2025/2026', devise: 'EUR', statut: 'Versé', status: 'PAID', amount: '297.27', baseAmount: '221.05', paidAt: '2026-04-01T00:00:00.000Z' },
          { mois: 'Mars', annee: '2025/2026', devise: 'XOF', statut: 'Versé', status: 'PAID', amount: '145000', baseAmount: '145000', paidAt: '2026-03-01T00:00:00.000Z' },
        ],
      },
      'DELETE /student/documents/d2/submission': { items: [documents.items[0]] },
      ...overrides,
    }
    const body = routesTable[`${method} ${path}`]

    return Promise.resolve(
      new Response(JSON.stringify(body ?? { message: 'introuvable' }), {
        status: body === undefined ? 404 : 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  render(<RouterProvider router={router} />)

  return router
}

describe('Pages du portail boursier', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('construit le tableau de bord à partir des données réelles', async () => {
    mockApi()
    renderAt('/portal')

    expect(await screen.findByRole('heading', { name: 'Bonjour, Awa' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Commencer ma demande' })).toHaveAttribute('href', '/portal/renouvellement')
    expect(screen.getByText('1 document(s) à fournir')).toBeInTheDocument()
    expect(normalize(screen.getByRole('heading', { name: 'Allocation mensuelle' }).nextElementSibling?.textContent ?? null)).toBe('221,05 €')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62')
    // L'échéance est portée une seule fois, par la bande de campagne : période et temps restant.
    const band = screen.getByRole('region', { name: 'Renouvellement 2026/2027' })

    expect(within(band).getByText(/Dépôt du 1 septembre 2026 au 31 décembre 2026 inclus/)).toBeInTheDocument()
    expect(within(band).getByText(/pour déposer$/)).toBeInTheDocument()
  })

  it('totalise les paiements par devise sans reparser de texte', async () => {
    mockApi()
    renderAt('/portal/paiements')

    const table = await screen.findByRole('table', { name: /2025\/2026/ })
    const rows = within(table).getAllByRole('row')

    expect(normalize(rows[1].textContent)).toContain('297,27 €')
    expect(normalize(rows[2].textContent)).toContain('145 000 F CFA')
    expect(normalize(screen.getByRole('heading', { name: /Année universitaire 2025\/2026/ }).textContent)).toContain('297,27 € + 145 000 F CFA')
  })

  it('propose de remplacer un document refusé et confirme l’annulation d’un dépôt', async () => {
    const fetchMock = mockApi()

    renderAt('/portal/documents')

    expect(await screen.findByText('Motif du refus : Illisible')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remplacer Relevé de notes S5' }))
    expect(screen.getByLabelText('Pièce concernée')).toHaveValue('doc:d1')

    await userEvent.click(screen.getByRole('button', { name: 'Annuler le dépôt Certificat 2025/2026' }))

    const dialog = screen.getByRole('dialog', { name: 'Annuler ce dépôt ?' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Annuler le dépôt' }))

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/student/documents/d2/submission'),
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(await screen.findByText('Dépôt annulé.')).toBeInTheDocument()
    expect(screen.queryByText('Certificat 2025/2026')).not.toBeInTheDocument()
  })
})
