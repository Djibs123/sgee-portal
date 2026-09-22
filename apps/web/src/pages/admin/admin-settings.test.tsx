import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bodyOf, mockApi, renderAt, type Reply } from '../../test/mockApi'

const admin = { id: 'ad1', email: 'agent@sgee.sn', name: 'Aminata Sow', role: 'ADMIN', lastLoginAt: null }
const superAdmin = { ...admin, role: 'SUPER_ADMIN' }

const year = { id: 'y1', code: '2026-2027', label: '2026/2027', startsOn: '2026-09-01', endsOn: '2027-08-31', isCurrent: true }

const renewal = {
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
  requirements: [
    { documentTypeCode: 'CERTIFICAT_INSCRIPTION', label: 'Certificat d’inscription', description: null, cycles: [], isRequired: true },
    { documentTypeCode: 'LETTRE_DIRECTEUR_THESE', label: 'Lettre du directeur de thèse', description: null, cycles: ['DOCTORATE'], isRequired: true },
  ],
  requestCounts: { DRAFT: 3, SUBMITTED: 2, APPROVED: 5 },
}

const adminApi = (table: Record<string, Reply>, profile: unknown = superAdmin) => mockApi({ 'GET /admin/me': profile, ...table })

const campaignsApi = {
  'GET /admin/campaigns': { items: [renewal] },
  'GET /admin/academic-years': { items: [year] },
}

describe('Back-office : étudiants, campagnes et journal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('recherche un étudiant et renvoie vers ses demandes', async () => {
    const fetchMock = adminApi(
      {
        'GET /admin/students': {
          items: [
            {
              id: 's1',
              code: 'STU001',
              matricule: '123',
              firstName: 'Awa',
              lastName: 'Fall',
              email: 'awa@example.org',
              level: 'Licence 3',
              field: 'Informatique',
              academicYear: '2025/2026',
              scholarshipStatus: 'ACTIVE',
              lastLoginAt: null,
            },
          ],
          page: 1,
          pageSize: 25,
          total: 1,
        },
      },
      admin,
    )
    const router = renderAt('/admin/etudiants')

    await userEvent.type(await screen.findByRole('textbox', { name: 'Rechercher un étudiant' }), 'Fall')
    await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }))

    expect(router.state.location.search).toBe('?search=Fall')
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('search=Fall')
    expect(await screen.findByRole('link', { name: 'Voir les demandes de Awa Fall' })).toHaveAttribute('href', '/admin/demandes?search=STU001')
  })

  it('présente les campagnes en lecture seule aux instructeurs', async () => {
    adminApi(campaignsApi, admin)
    renderAt('/admin/campagnes')

    const row = (await screen.findByRole('rowheader', { name: /Renouvellement 2026\/2027/ })).closest('tr') as HTMLElement

    expect(within(row).getByText(/du 1 septembre 2026 au 31 décembre 2026 inclus/)).toBeInTheDocument()
    // Les brouillons restent privés : ils n'apparaissent pas dans les compteurs.
    expect(within(row).getByRole('link', { name: 'Demandes de la campagne Renouvellement 2026/2027' })).toHaveTextContent('Soumise : 2, Acceptée : 5')
    expect(screen.queryByRole('button', { name: 'Nouvelle campagne' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Clôturer/ })).not.toBeInTheDocument()
  })

  it('crée une campagne en reprenant les pièces de la précédente', async () => {
    const fetchMock = adminApi({ ...campaignsApi, 'POST /admin/campaigns': { ...renewal, id: 'c2' } })

    renderAt('/admin/campagnes')

    await userEvent.click(await screen.findByRole('button', { name: 'Nouvelle campagne' }))

    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle campagne' })

    await userEvent.type(within(dialog).getByLabelText(/^Titre/), 'Renouvellement 2027/2028')
    fireEvent.change(within(dialog).getByLabelText(/^Premier jour/), { target: { value: '2027-09-01' } })
    fireEvent.change(within(dialog).getByLabelText(/^Dernier jour/), { target: { value: '2027-12-31' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Campagne « Renouvellement 2027/2028 » créée.')).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/admin/campaigns')).toEqual({
      type: 'RENEWAL',
      academicYearId: 'y1',
      title: 'Renouvellement 2027/2028',
      opensAt: '2027-09-01T00:00:00.000Z',
      closesAt: '2028-01-01T00:00:00.000Z',
      requirements: [
        { documentTypeCode: 'CERTIFICAT_INSCRIPTION', cycles: [], isRequired: true },
        { documentTypeCode: 'LETTRE_DIRECTEUR_THESE', cycles: ['DOCTORATE'], isRequired: true },
      ],
    })
  })

  it('clôture une campagne après confirmation', async () => {
    const fetchMock = adminApi({ ...campaignsApi, 'POST /admin/campaigns/c1/close': { ...renewal, phase: 'CLOSED' } })

    renderAt('/admin/campagnes')

    await userEvent.click(await screen.findByRole('button', { name: 'Clôturer Renouvellement 2026/2027' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Clôturer la campagne ?' })).getByRole('button', { name: 'Clôturer' }))

    expect(await screen.findByText('Campagne « Renouvellement 2026/2027 » clôturée.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url, init]) => url.endsWith('/admin/campaigns/c1/close') && init?.method === 'POST')).toBe(true)
  })

  it('affiche le journal d’audit filtré aux super-administrateurs', async () => {
    const fetchMock = adminApi({
      'GET /admin/audit-logs': {
        items: [
          {
            id: 'l1',
            actorType: 'ADMIN',
            actorId: 'ad1aaaaa-0000-0000-0000-000000000000',
            action: 'RIB_IBAN_REVEALED',
            entityType: 'Rib',
            entityId: 'rib1aaaa-0000-0000-0000-000000000000',
            metadata: null,
            ip: '127.0.0.1',
            createdAt: '2026-09-21T10:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 50,
        total: 1,
      },
    })
    const router = renderAt('/admin/journal')

    expect(await screen.findByRole('cell', { name: 'IBAN consulté' })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Action' }), 'REQUEST_APPROVED')

    expect(router.state.location.search).toBe('?action=REQUEST_APPROVED')
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('action=REQUEST_APPROVED')
  })

  it('réserve le journal d’audit aux super-administrateurs', async () => {
    adminApi({}, admin)
    renderAt('/admin/journal')

    expect(await screen.findByText('Accès réservé aux super-administrateurs.')).toBeInTheDocument()
  })
})
