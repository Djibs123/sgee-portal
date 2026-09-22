import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bodyOf, mockApi, renderAt } from '../../test/mockApi'

const campaign = (type: 'RENEWAL' | 'NEW_APPLICATION', title: string) => ({
  id: type === 'RENEWAL' ? 'c1' : 'c2',
  type,
  title,
  instructions: null,
  academicYear: { id: 'y1', code: '2026-2027', label: '2026/2027' },
  opensAt: '2026-09-01T00:00:00.000Z',
  closesAt: '2027-01-01T00:00:00.000Z',
  closedAt: null,
  maxAgeNonDoctoral: 30,
  phase: 'OPEN',
  phaseLabel: 'Ouverte',
  requirements: [],
})

const applicant = {
  id: 'a1',
  email: 'moussa@example.org',
  firstName: 'Moussa',
  lastName: 'Diop',
  birthDate: '2006-03-14',
  phone: null,
  emailVerified: true,
  studentNumber: null,
}

const anonymous = { 'GET /applicant/me': { status: 401, body: { message: 'Non authentifié' } } }
const applicantSpace = {
  'GET /applicant/campaigns/current': {
    campaign: campaign('NEW_APPLICATION', 'Candidatures 2026/2027'),
    request: null,
    eligibility: { eligible: true, blockers: [], warnings: [] },
  },
  'GET /applicant/requests': { items: [] },
  'GET /applicant/notifications': { items: [], unreadCount: 0, page: 1, pageSize: 10, total: 0 },
}
const NEUTRAL = 'Si cette adresse peut être utilisée, un e-mail vient d’être envoyé.'
const TOKEN = 'jeton-de-test-suffisamment-long-0123456789'

describe('Candidature et accès aux comptes', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('publie sur l’accueil les campagnes ouvertes avec l’action adaptée', async () => {
    mockApi({
      'GET /public/campaigns': {
        items: [campaign('RENEWAL', 'Renouvellement 2026/2027'), campaign('NEW_APPLICATION', 'Candidatures 2026/2027')],
      },
    })

    renderAt('/')

    expect(await screen.findByText('Candidatures 2026/2027')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Renouveler ma bourse' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Déposer une candidature' })).toHaveAttribute('href', '/candidature')
  })

  it('crée un compte candidat après contrôle du mot de passe', async () => {
    const fetchMock = mockApi({ ...anonymous, 'POST /applicant/auth/register': { status: 202, body: { message: NEUTRAL } } })

    renderAt('/candidature/inscription')

    await userEvent.type(await screen.findByLabelText(/^Prénom/), 'Moussa')
    await userEvent.type(screen.getByLabelText(/^Nom/), 'Diop')
    fireEvent.change(screen.getByLabelText(/^Date de naissance/), { target: { value: '2006-03-14' } })
    await userEvent.type(screen.getByLabelText(/^Adresse e-mail/), 'moussa@example.org')
    await userEvent.type(screen.getByLabelText(/^Mot de passe/), 'court')
    await userEvent.type(screen.getByLabelText(/^Confirmation/), 'court')
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(await screen.findByText('Le mot de passe doit contenir au moins 12 caractères.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Mot de passe/)).toHaveFocus()

    await userEvent.clear(screen.getByLabelText(/^Mot de passe/))
    await userEvent.type(screen.getByLabelText(/^Mot de passe/), 'une phrase de passe solide')
    await userEvent.clear(screen.getByLabelText(/^Confirmation/))
    await userEvent.type(screen.getByLabelText(/^Confirmation/), 'une phrase de passe solide')
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(await screen.findByRole('heading', { name: 'Vérifiez votre boîte de réception' })).toBeInTheDocument()
    expect(screen.getByText(NEUTRAL)).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/applicant/auth/register')).toEqual({
      email: 'moussa@example.org',
      password: 'une phrase de passe solide',
      firstName: 'Moussa',
      lastName: 'Diop',
      birthDate: '2006-03-14',
    })
  })

  it('confirme l’adresse e-mail sur action explicite et retire le jeton de l’URL', async () => {
    const fetchMock = mockApi({ ...anonymous, 'POST /applicant/auth/verify-email': { success: true } })
    const router = renderAt(`/candidature/verifier-email?token=${TOKEN}`)

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmer mon adresse' }))

    expect(await screen.findByRole('heading', { name: 'Adresse e-mail confirmée' })).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/applicant/auth/verify-email')).toEqual({ token: TOKEN })
    expect(router.state.location.search).toBe('')
  })

  it('propose un nouveau lien quand la confirmation échoue', async () => {
    mockApi({
      ...anonymous,
      'POST /applicant/auth/verify-email': { status: 400, body: { message: 'Lien invalide ou expiré' } },
    })

    renderAt(`/candidature/verifier-email?token=${TOKEN}`)
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmer mon adresse' }))

    expect(await screen.findByText('Lien invalide ou expiré')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recevoir un nouveau lien' })).toBeInTheDocument()
  })

  it('signale une adresse non confirmée à la connexion et permet de renvoyer le lien', async () => {
    const fetchMock = mockApi({
      ...anonymous,
      'POST /applicant/auth/login': { status: 403, body: { message: 'Confirmez votre adresse e-mail avant de vous connecter' } },
      'POST /applicant/auth/resend-verification': { status: 202, body: { message: NEUTRAL } },
    })

    renderAt('/candidature/connexion')

    await userEvent.type(await screen.findByLabelText(/^Adresse e-mail/), 'moussa@example.org')
    await userEvent.type(screen.getByLabelText(/^Mot de passe/), 'une phrase de passe solide')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByText('Confirmez votre adresse e-mail avant de vous connecter')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Adresse e-mail du compte/)).toHaveValue('moussa@example.org')

    await userEvent.click(screen.getByRole('button', { name: 'Recevoir un nouveau lien' }))

    expect(await screen.findByText(NEUTRAL)).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/applicant/auth/resend-verification')).toEqual({ email: 'moussa@example.org' })
  })

  it('ouvre l’espace candidat après connexion avec l’assistant partagé', async () => {
    mockApi({ ...anonymous, ...applicantSpace, 'POST /applicant/auth/login': { success: true, applicant } })

    renderAt('/candidature/connexion')

    await userEvent.type(await screen.findByLabelText(/^Adresse e-mail/), 'moussa@example.org')
    await userEvent.type(screen.getByLabelText(/^Mot de passe/), 'une phrase de passe solide')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('heading', { name: 'Ma candidature' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Déposer ma candidature' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument()
  })

  it('annonce l’attribution de la bourse et renvoie vers l’espace boursier', async () => {
    mockApi({ ...applicantSpace, 'GET /applicant/me': { ...applicant, studentNumber: 'SGEE2026-00042' } })

    renderAt('/candidature/espace')

    expect(await screen.findByText('Bourse attribuée')).toBeInTheDocument()
    expect(screen.getByText(/SGEE2026-00042/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Accéder à l’espace boursier' })).toHaveAttribute('href', '/login')
  })

  it('redirige vers la connexion sans session candidat', async () => {
    mockApi(anonymous)

    const router = renderAt('/candidature/espace')

    expect(await screen.findByRole('heading', { name: 'Espace candidat' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/candidature/connexion')
  })

  it('demande un lien de réinitialisation pour le type de compte choisi', async () => {
    const fetchMock = mockApi({ 'POST /auth/password/forgot': { status: 202, body: { message: NEUTRAL } } })

    renderAt('/mot-de-passe-oublie?compte=candidat')

    expect(await screen.findByRole('radio', { name: 'Compte candidat' })).toBeChecked()

    await userEvent.type(screen.getByLabelText(/^Adresse e-mail/), 'moussa@example.org')
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le lien' }))

    expect(await screen.findByText(NEUTRAL)).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/auth/password/forgot')).toEqual({ email: 'moussa@example.org', accountType: 'APPLICANT' })
  })

  it('enregistre un nouveau mot de passe avec le jeton reçu', async () => {
    const fetchMock = mockApi({ 'POST /auth/password/reset': { success: true } })
    const router = renderAt(`/reinitialiser?token=${TOKEN}`)

    await userEvent.type(await screen.findByLabelText(/^Nouveau mot de passe/), 'une phrase de passe solide')
    await userEvent.type(screen.getByLabelText(/^Confirmation/), 'une autre phrase de passe')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Les deux mots de passe ne correspondent pas.')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText(/^Confirmation/))
    await userEvent.type(screen.getByLabelText(/^Confirmation/), 'une phrase de passe solide')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByRole('heading', { name: 'Mot de passe modifié' })).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'POST', '/auth/password/reset')).toEqual({ token: TOKEN, password: 'une phrase de passe solide' })
    expect(router.state.location.search).toBe('')
  })
})
