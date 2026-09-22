import { Outlet } from 'react-router'
import { AdminSessionProvider, StudentSessionProvider } from '../session/sessions'

/** Session boursier partagée par la page de connexion et le portail. */
export function StudentSessionRoot() {
  return (
    <StudentSessionProvider>
      <Outlet />
    </StudentSessionProvider>
  )
}

/** Session admin partagée par la connexion et le back-office. */
export function AdminSessionRoot() {
  return (
    <AdminSessionProvider>
      <Outlet />
    </AdminSessionProvider>
  )
}
