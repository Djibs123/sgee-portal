import { createBrowserRouter, type RouteObject } from 'react-router'
import { AdminLayout } from './layouts/AdminLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { AdminSessionRoot, StudentSessionRoot } from './layouts/SessionRoots'
import { AdminHomeRoute } from './pages/AdminHomeRoute'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { CursusPage } from './pages/CursusPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { GeneralPage } from './pages/GeneralPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PaiementsPage } from './pages/PaiementsPage'
import { PublicHomePage } from './pages/PublicHomePage'
import { RibPage } from './pages/RibPage'

/** Chaque espace a son fournisseur de session : aucune requête de session sur les pages publiques. */
export const routes: RouteObject[] = [
  { path: '/', element: <PublicHomePage /> },
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
        children: [{ index: true, element: <AdminHomeRoute /> }],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
