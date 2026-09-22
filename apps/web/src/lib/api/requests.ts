import { downloadFile, requestJson, sendForm, sendJson } from './client'
import type { CampaignView, CurrentCampaign, Eligibility, ListResponse, RequestSummary } from './student'

/** Espace propriétaire : boursier (renouvellement) ou candidat (première bourse). */
export type RequestSpace = 'student' | 'applicant'

export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INCOMPLETE'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'

export type AcademicResult = 'PASSED' | 'REPEATED' | 'FAILED'

export type RequestDocumentView = {
  id: string | null
  documentTypeCode: string
  label: string
  description: string | null
  required: boolean
  status: 'REQUIRED' | 'PENDING' | 'VALIDATED' | 'REJECTED'
  statusLabel: string
  originalName: string | null
  submittedAt: string | null
  reviewComment: string | null
  isDownloadable: boolean
}

export type RequestHistoryEntry = {
  fromStatus: RequestStatus | null
  toStatus: RequestStatus
  toStatusLabel: string
  actorType: 'STUDENT' | 'ADMIN' | 'APPLICANT' | 'SYSTEM'
  comment: string | null
  createdAt: string
}

export type RequestView = {
  id: string
  reference: string
  type: 'RENEWAL' | 'NEW_APPLICATION'
  status: RequestStatus
  statusLabel: string
  isEditable: boolean
  version: number
  campaign: CampaignView
  targetLevel: string | null
  targetLevelLabel: string | null
  institution: string | null
  city: string | null
  country: string | null
  fieldOfStudy: string | null
  programName: string | null
  previousLevel: string | null
  previousLevelLabel: string | null
  previousResult: AcademicResult | null
  previousAverage: string | null
  changedField: boolean
  changedInstitution: boolean
  baccalaureateSeries: string | null
  baccalaureateYear: number | null
  baccalaureateMention: string | null
  baccalaureateAverage: string | null
  motivation: string | null
  submittedAt: string | null
  decidedAt: string | null
  decisionComment: string | null
  createdAt: string
  updatedAt: string
  eligibility: Eligibility | null
  documents: RequestDocumentView[]
  history: RequestHistoryEntry[]
}

/** Champs modifiables ; `version` sert de verrou optimiste. */
export type RequestUpdate = Partial<{
  version: number
  targetLevel: string
  institution: string
  city: string
  country: string
  fieldOfStudy: string
  programName: string
  previousLevel: string
  previousResult: AcademicResult
  previousAverage: number
  changedField: boolean
  changedInstitution: boolean
  baccalaureateSeries: string
  baccalaureateYear: number
  baccalaureateMention: string
  baccalaureateAverage: number
  motivation: string
}>

/** Réponse 422 de la soumission : champs et pièces manquants. */
export type SubmissionProblem = {
  message: string
  missingFields?: string[]
  missingDocuments?: Array<{ documentTypeCode: string; label: string }>
  blockers?: Array<{ code: string; message: string }>
}

export const getCurrentCampaign = (space: RequestSpace) =>
  requestJson<CurrentCampaign>(`/${space}/campaigns/current`)

export const listRequests = (space: RequestSpace) =>
  requestJson<ListResponse<RequestSummary>>(`/${space}/requests`)

export const createRequest = (space: RequestSpace, campaignId: string) =>
  sendJson<RequestView>(`/${space}/requests`, 'POST', { campaignId })

export const getRequest = (space: RequestSpace, requestId: string) =>
  requestJson<RequestView>(`/${space}/requests/${requestId}`)

export const updateRequest = (space: RequestSpace, requestId: string, update: RequestUpdate) =>
  sendJson<RequestView>(`/${space}/requests/${requestId}`, 'PATCH', update)

export const submitRequest = (space: RequestSpace, requestId: string) =>
  sendJson<RequestView>(`/${space}/requests/${requestId}/submit`, 'POST', { honorDeclaration: true })

export const withdrawRequest = (space: RequestSpace, requestId: string) =>
  sendJson<RequestView>(`/${space}/requests/${requestId}/withdraw`, 'POST')

export function uploadRequestDocument(
  space: RequestSpace,
  requestId: string,
  documentTypeCode: string,
  file: File,
) {
  const formData = new FormData()

  formData.append('documentTypeCode', documentTypeCode)
  formData.append('file', file)

  return sendForm<RequestView>(`/${space}/requests/${requestId}/documents`, formData)
}

export const removeRequestDocument = (space: RequestSpace, requestId: string, documentId: string) =>
  sendJson<RequestView>(`/${space}/requests/${requestId}/documents/${documentId}`, 'DELETE')

export const downloadRequestDocument = (space: RequestSpace, requestId: string, documentId: string) =>
  downloadFile(`/${space}/requests/${requestId}/documents/${documentId}/download`)
