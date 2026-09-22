import type { AdminRole, StudentDocumentStatus, StudentRibStatus } from '../../types'
import { downloadFile, requestJson, sendJson } from './client'
import type { RequestView } from './requests'
import type { CampaignView, ListResponse, RequestSummary } from './student'

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

/* Instruction des demandes de bourse */

export type AdminRequestOwner = {
  kind: 'STUDENT' | 'APPLICANT'
  name: string
  email: string
  studentNumber: string | null
}

export type AdminRequestSummary = RequestSummary & {
  warningCount: number
  owner: AdminRequestOwner
}

export type AdminRequestDetail = RequestView & {
  warningCount: number
  owner: AdminRequestOwner & {
    birthDate: string | null
    age: number | null
    scholarshipStatus: string | null
    currentLevel: string | null
    cursus: Array<{
      academicYear: string
      institution: string | null
      level: string | null
      result: string | null
      isCurrent: boolean
    }>
  }
}

export type AdminRequestFilters = {
  page?: number
  pageSize?: number
  type?: string
  status?: string
  campaignId?: string
  targetLevel?: string
  hasWarnings?: boolean
  search?: string
}

export type AdminCampaign = CampaignView & {
  /** Nombre de demandes par statut. */
  requestCounts: Partial<Record<string, number>>
}

/** Paramètres de requête sans valeurs vides (l'API refuse les champs inconnus ou vides). */
export function toQueryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== false) {
      query.set(key, String(value))
    }
  }

  const text = query.toString()

  return text ? `?${text}` : ''
}

export const listAdminRequests = (filters: AdminRequestFilters) =>
  requestJson<Paginated<AdminRequestSummary>>(`/admin/requests${toQueryString(filters)}`)

export const getAdminRequest = (requestId: string) => requestJson<AdminRequestDetail>(`/admin/requests/${requestId}`)

export const downloadAdminRequestDocument = (requestId: string, documentId: string) =>
  downloadFile(`/admin/requests/${requestId}/documents/${documentId}/download`)

export const startAdminReview = (requestId: string) =>
  sendJson<AdminRequestDetail>(`/admin/requests/${requestId}/start-review`, 'POST', {})

/** Complément : motif général et, si besoin, pièces à redéposer (même motif pour chacune). */
export const requestAdminInfo = (requestId: string, comment: string, documentTypeCodes: string[] = []) =>
  sendJson<AdminRequestDetail>(`/admin/requests/${requestId}/request-info`, 'POST', {
    comment,
    ...(documentTypeCodes.length > 0
      ? { documents: documentTypeCodes.map((documentTypeCode) => ({ documentTypeCode, comment })) }
      : {}),
  })

export const approveAdminRequest = (requestId: string, comment?: string) =>
  sendJson<AdminRequestDetail>(`/admin/requests/${requestId}/approve`, 'POST', comment ? { comment } : {})

export const rejectAdminRequest = (requestId: string, comment: string) =>
  sendJson<AdminRequestDetail>(`/admin/requests/${requestId}/reject`, 'POST', { comment })

export const listAdminCampaigns = () => requestJson<ListResponse<AdminCampaign>>('/admin/campaigns')
