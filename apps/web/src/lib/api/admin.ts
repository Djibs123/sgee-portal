import type { AdminRole, StudentDocumentStatus, StudentRibStatus } from '../../types'
import { downloadFile, requestJson, sendJson } from './client'
import type { ListResponse } from './student'

export type AdminProfile = {
  id: string
  email: string
  name: string
  role: AdminRole
  lastLoginAt: string | null
}

export type AdminLoginResponse = {
  success: boolean
  admin: AdminProfile
}

export type AdminStudentMinimal = {
  id: string
  code: string
  firstName: string
  lastName: string
  email: string
}

export type AdminPendingDocument = {
  id: string
  nom: string
  type: string
  status: StudentDocumentStatus
  statusLabel: string
  originalName: string | null
  mimeType: string | null
  size: number | null
  uploadedAt: string | null
  submittedAt: string | null
  submittedAtLabel: string
  reviewedAt: string | null
  reviewedAtLabel: string
  reviewComment: string | null
  isDownloadable: boolean
  student: AdminStudentMinimal
}

export type AdminPendingRib = {
  id: string
  bankName: string
  holderName: string
  ibanMasked: string
  ibanLast4: string | null
  bic: string
  status: StudentRibStatus
  statusLabel: string
  submittedAt: string | null
  reviewedAt: string | null
  reviewComment: string | null
  student: AdminStudentMinimal
  activeRib: { bankName: string; ibanMasked: string; validatedAt: string | null } | null
  /** Autres boursiers utilisant le même IBAN : signal de fraude possible. */
  sharedIbanCount: number
}

export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export const getAdminMe = () => requestJson<AdminProfile>('/admin/me')

export const adminLogin = (email: string, password: string) =>
  sendJson<AdminLoginResponse>('/admin/auth/login', 'POST', { email, password })

export const adminLogout = () => sendJson<{ success: boolean }>('/admin/auth/logout', 'POST')

export const getAdminPendingDocuments = () =>
  requestJson<ListResponse<AdminPendingDocument>>('/admin/documents/pending')

export const validateAdminDocument = (documentId: string) =>
  sendJson<AdminPendingDocument>(`/admin/documents/${documentId}/validate`, 'PATCH', {})

export const rejectAdminDocument = (documentId: string, reviewComment: string) =>
  sendJson<AdminPendingDocument>(`/admin/documents/${documentId}/reject`, 'PATCH', { reviewComment })

export const downloadAdminDocument = (documentId: string) =>
  downloadFile(`/admin/documents/${documentId}/download`)

export const getAdminPendingRibs = (page = 1, pageSize = 50) =>
  requestJson<Paginated<AdminPendingRib>>(`/admin/ribs/pending?page=${page}&pageSize=${pageSize}`)

/** IBAN complet d'un RIB à instruire : chaque consultation est journalisée côté API. */
export const revealAdminRibIban = (ribId: string) =>
  requestJson<{ iban: string }>(`/admin/ribs/${ribId}/iban`)

export const validateAdminRib = (ribId: string) =>
  sendJson<AdminPendingRib>(`/admin/ribs/${ribId}/validate`, 'PATCH', {})

export const rejectAdminRib = (ribId: string, reviewComment: string) =>
  sendJson<AdminPendingRib>(`/admin/ribs/${ribId}/reject`, 'PATCH', { reviewComment })
