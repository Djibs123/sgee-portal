import { Outlet } from 'react-router'
import {
  AdminSessionProvider,
  ApplicantSessionProvider,
  StudentSessionProvider,
} from '../session/sessions'

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

/** Session candidat partagée par les pages de candidature. */
export function ApplicantSessionRoot() {
  return (
    <ApplicantSessionProvider>
      <Outlet />
    </ApplicantSessionProvider>
  )
}
