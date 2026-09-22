import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RequestView } from '../lib/api'
import { routes } from '../router'

const campaign = {
  id: 'c1',
  type: 'RENEWAL' as const,
  title: 'Renouvellement 2026/2027',
  instructions: 'Déposez votre certificat d’inscription et vos résultats.',
  academicYear: { id: 'y1', code: '2026-2027', label: '2026/2027' },
  opensAt: '2026-09-01T00:00:00.000Z',
  closesAt: '2027-01-01T00:00:00.000Z',
  closedAt: null,
  maxAgeNonDoctoral: 30,
  phase: 'OPEN' as const,
  phaseLabel: 'Ouverte',
  requirements: [
    { documentTypeCode: 'CERTIFICAT_INSCRIPTION', label: 'Certificat d’inscription', description: null, cycles: [], isRequired: true },
  ],
}

const buildRequest = (overrides: Partial<RequestView> = {}): RequestView => ({
  id: 'r1',
  reference: 'REN-2026-000001',
  type: 'RENEWAL',
  status: 'DRAFT',
  statusLabel: 'Brouillon',
  isEditable: true,
  version: 1,
  campaign,
  targetLevel: null,
  targetLevelLabel: null,
  institution: null,
  city: null,
  country: null,
  fieldOfStudy: null,
  programName: null,
  previousLevel: null,
  previousLevelLabel: null,
  previousResult: null,
  previousAverage: null,
  changedField: false,
  changedInstitution: false,
  baccalaureateSeries: null,
  baccalaureateYear: null,
  baccalaureateMention: null,
  baccalaureateAverage: null,
  motivation: null,
  submittedAt: null,
  decidedAt: null,
  decisionComment: null,
  createdAt: '2026-09-10T08:00:00.000Z',
  updatedAt: '2026-09-10T08:00:00.000Z',
  eligibility: { eligible: true, blockers: [], warnings: [] },
  documents: [],
  history: [
    { fromStatus: null, toStatus: 'DRAFT', toStatusLabel: 'Brouillon', actorType: 'STUDENT', comment: null, createdAt: '2026-09-10T08:00:00.000Z' },
  ],
  ...overrides,
})

const summaryOf = (request: RequestView) => ({
  id: request.id,
  reference: request.reference,
  type: request.type,
  status: request.status,
  statusLabel: request.statusLabel,
  campaignTitle: campaign.title,
  targetLevel: request.targetLevel,
  targetLevelLabel: request.targetLevelLabel,
  submittedAt: request.submittedAt,
  decidedAt: request.decidedAt,
  updatedAt: request.updatedAt,
})

type Reply = unknown | { status: number; body: unknown } | ((init?: RequestInit) => unknown)

const isStatusReply = (value: unknown): value is { status: number; body: unknown } =>
  typeof value === 'object' && value !== null && 'status' in value && 'body' in value && Object.keys(value).length === 2

function mockApi(table: Record<string, Reply>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const path = url.replace(/^.*\/api/, '').split('?')[0]
    const replies: Record<string, Reply> = {
      'GET /me': { id: 's1', firstName: 'Awa', lastName: 'Fall', studentNumber: 'STU001' },
      ...table,
    }
    const reply = replies[`${init?.method ?? 'GET'} ${path}`]
    const resolved = typeof reply === 'function' ? (reply as (init?: RequestInit) => unknown)(init) : reply
    const { status, body } = isStatusReply(resolved)
      ? resolved
      : { status: resolved === undefined ? 404 : 200, body: resolved ?? { message: 'introuvable' } }

    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

const bodyOf = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) => {
  const call = fetchMock.mock.calls.find(([url, init]) => url.endsWith(path) && init?.method === method)

  return call ? JSON.parse(String(call[1]?.body)) : undefined
}

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

describe('Renouvellement de la bourse', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('présente la campagne et crée la demande', async () => {
    const created = buildRequest()
    const fetchMock = mockApi({
      'GET /student/campaigns/current': { campaign, request: null, eligibility: { eligible: true, blockers: [], warnings: [] } },
      'GET /student/requests': { items: [] },
      'POST /student/requests': created,
      'GET /student/requests/r1': created,
    })

    renderAt('/portal/renouvellement')

    expect(await screen.findByRole('heading', { name: 'Renouvellement 2026/2027' })).toBeInTheDocument()
    // Dernier jour affiché = veille de la date de fermeture exclusive.
    expect(screen.getByText(/31 décembre 2026 inclus/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Commencer mon renouvellement' }))

    expect(await screen.findByRole('heading', { name: 'Étape 1 sur 4 : Année demandée' })).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/student/requests')).toEqual({ campaignId: 'c1' })
  })

  it('bloque le passage à l’étape suivante tant que les champs obligatoires manquent', async () => {
    const fetchMock = mockApi({
      'GET /student/campaigns/current': { campaign, request: summaryOf(buildRequest()), eligibility: null },
      'GET /student/requests': { items: [summaryOf(buildRequest())] },
      'GET /student/requests/r1': buildRequest(),
    })

    renderAt('/portal/renouvellement')
    await userEvent.click(await screen.findByRole('button', { name: 'Enregistrer et continuer' }))

    expect(await screen.findByText(/Complétez : niveau demandé, établissement, pays, filière/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Niveau demandé/ })).toHaveFocus()
    expect(screen.getByRole('combobox', { name: /Niveau demandé/ })).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  })

  it('enregistre le brouillon avec le verrou de version puis passe à l’étape suivante', async () => {
    const draft = buildRequest()
    const saved = buildRequest({
      version: 2,
      targetLevel: 'M1',
      targetLevelLabel: 'Master 1',
      institution: 'Université de Lorraine',
      country: 'France',
      fieldOfStudy: 'Informatique',
    })
    const fetchMock = mockApi({
      'GET /student/campaigns/current': { campaign, request: summaryOf(draft), eligibility: null },
      'GET /student/requests': { items: [summaryOf(draft)] },
      'GET /student/requests/r1': draft,
      'PATCH /student/requests/r1': saved,
    })

    renderAt('/portal/renouvellement')

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: /Niveau demandé/ }), 'M1')
    await userEvent.type(screen.getByRole('textbox', { name: /Établissement/ }), 'Université de Lorraine')
    await userEvent.type(screen.getByRole('textbox', { name: /Filière/ }), 'Informatique')
    await userEvent.type(screen.getByRole('textbox', { name: /Pays/ }), 'France')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer et continuer' }))

    const heading = await screen.findByRole('heading', { name: 'Étape 2 sur 4 : Année précédente' })

    expect(heading).toHaveFocus()
    expect(bodyOf(fetchMock, 'PATCH', '/student/requests/r1')).toEqual({
      targetLevel: 'M1',
      institution: 'Université de Lorraine',
      fieldOfStudy: 'Informatique',
      country: 'France',
      version: 1,
    })
    expect(screen.getByText(/Brouillon enregistré à/)).toBeInTheDocument()
  })

  it('affiche les pièces manquantes renvoyées par l’API lors de l’envoi', async () => {
    const ready = buildRequest({
      targetLevel: 'M1',
      targetLevelLabel: 'Master 1',
      institution: 'Université de Lorraine',
      country: 'France',
      fieldOfStudy: 'Informatique',
      previousLevel: 'L3',
      previousLevelLabel: 'Licence 3',
      previousResult: 'PASSED',
      eligibility: { eligible: true, blockers: [], warnings: [{ code: 'CHANGED_FIELD', message: 'Changement de filière déclaré.' }] },
    })

    mockApi({
      'GET /student/campaigns/current': { campaign, request: summaryOf(ready), eligibility: null },
      'GET /student/requests': { items: [summaryOf(ready)] },
      'GET /student/requests/r1': ready,
      'POST /student/requests/r1/submit': {
        status: 422,
        body: {
          message: 'La demande est incomplète',
          missingDocuments: [{ documentTypeCode: 'CERTIFICAT_INSCRIPTION', label: 'Certificat d’inscription' }],
        },
      },
    })

    renderAt('/portal/renouvellement')

    const stepper = await screen.findByRole('navigation', { name: 'Étapes de la demande' })

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer et continuer' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Enregistrer et continuer' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Enregistrer et continuer' }))

    expect(await screen.findByText('Changement de filière déclaré.')).toBeInTheDocument()
    expect(within(stepper).getAllByRole('button')).toHaveLength(3)

    const send = screen.getByRole('button', { name: 'Envoyer ma demande' })

    expect(send).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /J’atteste sur l’honneur/ }))
    await userEvent.click(send)

    expect(await screen.findByText('Pièce manquante : Certificat d’inscription')).toBeInTheDocument()
  })

  it('montre le complément demandé par le SGEE sur une demande incomplète', async () => {
    const incomplete = buildRequest({
      status: 'INCOMPLETE',
      statusLabel: 'Complément demandé',
      history: [
        { fromStatus: 'UNDER_REVIEW', toStatus: 'INCOMPLETE', toStatusLabel: 'Complément demandé', actorType: 'ADMIN', comment: 'Relevé de notes illisible.', createdAt: '2026-10-01T08:00:00.000Z' },
      ],
    })

    mockApi({
      'GET /student/campaigns/current': { campaign, request: summaryOf(incomplete), eligibility: null },
      'GET /student/requests': { items: [summaryOf(incomplete)] },
      'GET /student/requests/r1': incomplete,
    })

    renderAt('/portal/renouvellement')

    expect(await screen.findByText('Complément demandé par le SGEE')).toBeInTheDocument()
    expect(screen.getByText('Relevé de notes illisible.')).toBeInTheDocument()
  })

  it('suit une demande envoyée et permet de la retirer après confirmation', async () => {
    const submitted = buildRequest({
      status: 'SUBMITTED',
      statusLabel: 'Envoyée',
      isEditable: false,
      submittedAt: '2026-09-20T08:00:00.000Z',
      history: [
        { fromStatus: null, toStatus: 'DRAFT', toStatusLabel: 'Brouillon', actorType: 'STUDENT', comment: null, createdAt: '2026-09-10T08:00:00.000Z' },
        { fromStatus: 'DRAFT', toStatus: 'SUBMITTED', toStatusLabel: 'Envoyée', actorType: 'STUDENT', comment: null, createdAt: '2026-09-20T08:00:00.000Z' },
      ],
    })
    const fetchMock = mockApi({
      'GET /student/campaigns/current': { campaign, request: summaryOf(submitted), eligibility: null },
      'GET /student/requests': { items: [summaryOf(submitted)] },
      'GET /student/requests/r1': submitted,
      'POST /student/requests/r1/withdraw': { ...submitted, status: 'WITHDRAWN', statusLabel: 'Retirée' },
    })

    renderAt('/portal/renouvellement')

    const timeline = await screen.findByRole('list', { name: 'Historique de la demande' })

    expect(within(timeline).getAllByRole('listitem')).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Retirer ma demande' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Retirer la demande' }))

    expect(await screen.findByText('Demande REN-2026-000001 retirée.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url, init]) => url.endsWith('/withdraw') && init?.method === 'POST')).toBe(true)
  })
})
