import { createBrowserRouter, Outlet, type RouteObject } from 'react-router'
import { AppError } from './layouts/AppError'
import { FullPageMessage } from './layouts/FullPageMessage'
import { AdminLayout } from './layouts/AdminLayout'
import { ApplicantLayout } from './layouts/ApplicantLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { AdminSessionRoot, ApplicantSessionRoot, StudentSessionRoot } from './layouts/SessionRoots'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { ApplicantHomePage } from './pages/candidature/ApplicantHomePage'
import { ApplicantLoginPage } from './pages/candidature/ApplicantLoginPage'
import { ApplicantRegisterPage } from './pages/candidature/ApplicantRegisterPage'
import { ApplicantSpacePage } from './pages/candidature/ApplicantSpacePage'
import { VerifyEmailPage } from './pages/candidature/VerifyEmailPage'
import { CursusPage } from './pages/CursusPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { GeneralPage } from './pages/GeneralPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PaiementsPage } from './pages/PaiementsPage'
import { PublicHomePage } from './pages/PublicHomePage'
import { RenewalPage } from './pages/RenewalPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { RibPage } from './pages/RibPage'

type AdminPages = typeof import('./pages/admin')

/** Page du back-office chargée à la demande (fragment `pages/admin`). */
const adminPage = (name: keyof AdminPages) => async () => ({
  Component: (await import('./pages/admin'))[name],
})

/** Chaque espace a son fournisseur de session : aucune requête de session sur les pages publiques. */
const spaces: RouteObject[] = [
  { path: '/', element: <PublicHomePage /> },
  { path: '/mot-de-passe-oublie', element: <ForgotPasswordPage /> },
  { path: '/reinitialiser', element: <ResetPasswordPage /> },
  {
    element: <ApplicantSessionRoot />,
    children: [
      { path: '/candidature', element: <ApplicantHomePage /> },
      { path: '/candidature/inscription', element: <ApplicantRegisterPage /> },
      { path: '/candidature/verifier-email', element: <VerifyEmailPage /> },
      { path: '/candidature/connexion', element: <ApplicantLoginPage /> },
      {
        path: '/candidature/espace',
        element: <ApplicantLayout />,
        children: [{ index: true, element: <ApplicantSpacePage /> }],
      },
    ],
  },
  {
    element: <StudentSessionRoot />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/portal',
        element: <PortalLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'dossier', element: <GeneralPage /> },
          { path: 'cursus', element: <CursusPage /> },
          { path: 'paiements', element: <PaiementsPage /> },
          { path: 'rib', element: <RibPage /> },
          { path: 'documents', element: <DocumentsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'renouvellement', element: <RenewalPage /> },
          { path: '*', element: <NotFoundPage embedded /> },
        ],
      },
    ],
  },
  {
    element: <AdminSessionRoot />,
    children: [
      { path: '/admin/login', element: <AdminLoginPage /> },
      {
        path: '/admin',
        element: <AdminLayout />,
        hydrateFallbackElement: <FullPageMessage>Chargement de l’administration…</FullPageMessage>,
        children: [
          { index: true, lazy: adminPage('AdminOverviewPage') },
          { path: 'demandes', lazy: adminPage('AdminRequestsPage') },
          { path: 'demandes/:requestId', lazy: adminPage('AdminRequestDetailPage') },
          { path: 'validations', lazy: adminPage('AdminValidationsPage') },
          { path: 'etudiants', lazy: adminPage('AdminStudentsPage') },
          { path: 'campagnes', lazy: adminPage('AdminCampaignsPage') },
          { path: 'journal', lazy: adminPage('AdminAuditPage') },
          { path: '*', element: <NotFoundPage embedded home="/admin" /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]

/**
 * Une seule route englobante porte `errorElement` : une erreur de rendu, un chargement de
 * fragment en échec ou une exception de routeur affichent une page utilisable, jamais une page blanche.
 */
export const routes: RouteObject[] = [
  { element: <Outlet />, errorElement: <AppError />, children: spaces },
]

export const router = createBrowserRouter(routes)
