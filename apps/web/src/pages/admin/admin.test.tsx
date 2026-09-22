import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminRequestDetail } from '../../lib/api'
import { bodyOf, mockApi, renderAt, type Reply } from '../../test/mockApi'

const admin = { id: 'ad1', email: 'agent@sgee.sn', name: 'Aminata Sow', role: 'ADMIN', lastLoginAt: null }
const superAdmin = { ...admin, role: 'SUPER_ADMIN' }

const campaign = {
  id: 'c1',
  type: 'RENEWAL',
  title: 'Renouvellement 2026/2027',
  instructions: null,
  academicYear: { id: 'y1', code: '2026-2027', label: '2026/2027' },
  opensAt: '2026-09-01T00:00:00.000Z',
  closesAt: '2027-01-01T00:00:00.000Z',
  closedAt: null,
  maxAgeNonDoctoral: 30,
  phase: 'OPEN',
  phaseLabel: 'Ouverte',
  requirements: [],
  requestCounts: { SUBMITTED: 1 },
}

const owner = { kind: 'STUDENT', name: 'Awa Fall', email: 'awa@example.org', studentNumber: 'STU001' }

const summary = {
  id: 'r1',
  reference: 'REN-2026-000001',
  type: 'RENEWAL',
  status: 'SUBMITTED',
  statusLabel: 'Soumise',
  campaignTitle: campaign.title,
  targetLevel: 'M1',
  targetLevelLabel: 'Master 1',
  submittedAt: '2026-09-20T08:00:00.000Z',
  decidedAt: null,
  updatedAt: '2026-09-20T08:00:00.000Z',
  warningCount: 1,
  owner,
}

const detail = (overrides: Partial<AdminRequestDetail> = {}) =>
  ({
    ...summary,
    isEditable: false,
    version: 2,
    campaign,
    institution: 'Université de Lorraine',
    city: 'Nancy',
    country: 'France',
    fieldOfStudy: 'Informatique',
    programName: null,
    previousLevel: 'L3',
    previousLevelLabel: 'Licence 3',
    previousResult: 'REPEATED',
    previousAverage: '9.5',
    changedField: false,
    changedInstitution: false,
    baccalaureateSeries: null,
    baccalaureateYear: null,
    baccalaureateMention: null,
    baccalaureateAverage: null,
    motivation: null,
    decisionComment: null,
    createdAt: '2026-09-10T08:00:00.000Z',
    eligibility: { eligible: true, blockers: [], warnings: [{ code: 'SECOND_REPEAT', message: 'Deuxième redoublement dans le cycle.' }] },
    documents: [
      {
        id: 'rd1',
        documentTypeCode: 'CERTIFICAT_INSCRIPTION',
        label: 'Certificat d’inscription',
        description: null,
        required: true,
        status: 'PENDING',
        statusLabel: 'En attente de validation',
        originalName: 'certificat.pdf',
        submittedAt: '2026-09-19T08:00:00.000Z',
        reviewComment: null,
        isDownloadable: true,
      },
    ],
    history: [
      { fromStatus: 'DRAFT', toStatus: 'SUBMITTED', toStatusLabel: 'Soumise', actorType: 'STUDENT', comment: null, createdAt: '2026-09-20T08:00:00.000Z' },
    ],
    owner: { ...owner, birthDate: '2002-05-01', age: 24, scholarshipStatus: 'ACTIVE', currentLevel: 'L3', cursus: [] },
    ...overrides,
  }) as AdminRequestDetail

const adminApi = (table: Record<string, Reply>, profile: unknown = admin) => mockApi({ 'GET /admin/me': profile, ...table })

describe('Back-office', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirige vers la connexion sans session admin', async () => {
    mockApi({ 'GET /admin/me': { status: 401, body: { message: 'Non authentifié' } } })

    const router = renderAt('/admin/demandes')

    expect(await screen.findByRole('heading', { name: 'Espace administration' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/login')
  })

  it('résume le travail en attente et adapte le menu au rôle', async () => {
    const totals: Record<string, number> = { SUBMITTED: 4, UNDER_REVIEW: 2, INCOMPLETE: 1 }

    adminApi({
      'GET /admin/requests': (_init: RequestInit | undefined, url: URL) => ({
        items: [],
        page: 1,
        pageSize: 1,
        total: totals[url.searchParams.get('status') ?? ''] ?? 0,
      }),
      'GET /admin/documents/pending': { items: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }] },
      'GET /admin/ribs/pending': { items: [], page: 1, pageSize: 1, total: 5 },
    })

    renderAt('/admin')

    const toSubmitted = await screen.findByRole('link', { name: /Demandes à prendre en charge/ })

    expect(toSubmitted).toHaveAttribute('href', '/admin/demandes?status=SUBMITTED')
    expect(toSubmitted).toHaveTextContent('4')
    expect(screen.getByRole('link', { name: /Documents à valider/ })).toHaveTextContent('3')
    expect(screen.getByRole('link', { name: /RIB à valider/ })).toHaveTextContent('5')

    const navigation = screen.getByRole('navigation', { name: 'Back-office' })

    expect(within(navigation).getByRole('link', { name: 'Tableau de bord' })).toHaveAttribute('aria-current', 'page')
    expect(within(navigation).queryByRole('link', { name: 'Journal d’audit' })).not.toBeInTheDocument()
  })

  it('montre le journal d’audit aux super-administrateurs', async () => {
    adminApi(
      {
        'GET /admin/requests': { items: [], page: 1, pageSize: 1, total: 0 },
        'GET /admin/documents/pending': { items: [] },
        'GET /admin/ribs/pending': { items: [], page: 1, pageSize: 1, total: 0 },
      },
      superAdmin,
    )

    renderAt('/admin')

    expect(await screen.findByRole('link', { name: 'Journal d’audit' })).toBeInTheDocument()
  })

  it('filtre la file d’instruction via l’URL', async () => {
    const fetchMock = adminApi({
      'GET /admin/requests': { items: [summary], page: 1, pageSize: 20, total: 1 },
      'GET /admin/campaigns': { items: [campaign] },
    })
    const router = renderAt('/admin/demandes')

    expect(await screen.findByRole('link', { name: 'REN-2026-000001' })).toHaveAttribute('href', '/admin/demandes/r1')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Statut' }), 'UNDER_REVIEW')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Avec alertes uniquement' }))
    await userEvent.type(screen.getByRole('textbox', { name: /Recherche/ }), 'Fall')
    await userEvent.click(screen.getByRole('button', { name: 'Filtrer' }))

    expect(router.state.location.search).toBe('?status=UNDER_REVIEW&search=Fall&hasWarnings=true')

    const lastUrl = String(fetchMock.mock.calls.filter(([url]) => url.includes('/admin/requests')).at(-1)?.[0])

    expect(lastUrl).toContain('status=UNDER_REVIEW')
    expect(lastUrl).toContain('hasWarnings=true')
    expect(lastUrl).toContain('search=Fall')
  })

  it('prend en charge une demande puis la refuse avec un motif obligatoire', async () => {
    const fetchMock = adminApi({
      'GET /admin/requests/r1': detail(),
      'POST /admin/requests/r1/start-review': detail({ status: 'UNDER_REVIEW', statusLabel: 'En cours d’instruction' }),
      'POST /admin/requests/r1/reject': detail({ status: 'REJECTED', statusLabel: 'Refusée', decisionComment: 'Troisième redoublement.' }),
    })

    renderAt('/admin/demandes/r1')

    expect(await screen.findByRole('heading', { name: 'Demande REN-2026-000001' })).toBeInTheDocument()
    expect(screen.getByText('Deuxième redoublement dans le cycle.')).toBeInTheDocument()
    expect(screen.getByText(/par le boursier/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Prendre en charge' }))

    expect(await screen.findByText('Demande prise en charge.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prendre en charge' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Refuser' }))

    const dialog = await screen.findByRole('dialog', { name: 'Refuser la demande' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Refuser' }))
    expect(within(dialog).getByText('Saisissez au moins 3 caractères.')).toBeInTheDocument()

    await userEvent.type(within(dialog).getByRole('textbox'), 'Troisième redoublement.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Refuser' }))

    expect(await screen.findByText('Demande refusée.')).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/admin/requests/r1/reject')).toEqual({ comment: 'Troisième redoublement.' })
    expect(screen.queryByRole('heading', { name: 'Décision' })).not.toBeInTheDocument()
  })

  it('demande un complément en désignant les pièces à redéposer', async () => {
    const fetchMock = adminApi({
      'GET /admin/requests/r1': detail({ status: 'UNDER_REVIEW', statusLabel: 'En cours d’instruction' }),
      'POST /admin/requests/r1/request-info': detail({ status: 'INCOMPLETE', statusLabel: 'Complément demandé' }),
    })

    renderAt('/admin/demandes/r1')

    await userEvent.click(await screen.findByRole('button', { name: 'Demander un complément' }))

    const dialog = await screen.findByRole('dialog', { name: 'Demander un complément' })

    await userEvent.type(within(dialog).getByRole('textbox'), 'Certificat illisible')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Certificat d’inscription' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Demander le complément' }))

    expect(await screen.findByText('Complément demandé.')).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/admin/requests/r1/request-info')).toEqual({
      comment: 'Certificat illisible',
      documents: [{ documentTypeCode: 'CERTIFICAT_INSCRIPTION', comment: 'Certificat illisible' }],
    })
  })

  it('refuse un document du dossier avec un motif saisi dans une boîte de dialogue', async () => {
    const fetchMock = adminApi({
      'GET /admin/documents/pending': {
        items: [
          {
            id: 'd1',
            nom: 'Relevé de notes S5',
            type: 'RELEVE_NOTES',
            status: 'PENDING',
            statusLabel: 'En attente',
            originalName: 'releve.pdf',
            mimeType: 'application/pdf',
            size: 1000,
            uploadedAt: null,
            submittedAt: '2026-09-01T00:00:00.000Z',
            submittedAtLabel: '01/09/2026',
            reviewedAt: null,
            reviewedAtLabel: '',
            reviewComment: null,
            isDownloadable: true,
            student: { id: 's1', code: 'STU001', firstName: 'Awa', lastName: 'Fall', email: 'awa@example.org' },
          },
        ],
      },
      'GET /admin/ribs/pending': { items: [], page: 1, pageSize: 50, total: 0 },
      'PATCH /admin/documents/d1/reject': {},
    })

    renderAt('/admin/validations')

    await userEvent.click(await screen.findByRole('button', { name: 'Refuser Relevé de notes S5 – Awa Fall' }))

    const dialog = await screen.findByRole('dialog', { name: 'Motif du refus' })

    await userEvent.type(within(dialog).getByRole('textbox'), 'Document illisible')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Refuser' }))

    expect(await screen.findByText(/refus enregistré/)).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'PATCH', '/admin/documents/d1/reject')).toEqual({ reviewComment: 'Document illisible' })
  })
})
