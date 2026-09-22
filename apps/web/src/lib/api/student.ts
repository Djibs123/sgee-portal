import type { StudentDocumentStatus, StudentRibStatus } from '../../types'
import { downloadFile, requestJson, sendForm, sendJson } from './client'
import type { NotificationItem } from './notifications'

export type StudentProfile = {
  id: string
  studentNumber: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  scholarshipStatus: string
  codeEtudiant: string
  matricule: string
  nom: string
  prenom: string
  niveau: string
  niveauCode: string | null
  filiere: string
  academie: string
  pays: string
  anneeScolaire: string
  statutBourse: string
  typeBourse: string
  modePaiement: string
  dateNaissance: string
  villeNaissance: string
  paysNaissance: string
  sexe: string
  situation: string
  budget: string
  dateDebut: string
  dateFin: string
  dernierTraitement: string
  dateArrivee: string
  numAttribution: string
  allocationMensuelle: string
  allocationBase: string
  totalVerse: string
  progression: number
}

/** Vue d'un RIB côté étudiant : l'IBAN n'est jamais renvoyé en clair. */
export type StudentRib = {
  id: string
  banque: string
  titulaire: string
  bic: string
  ibanMasked: string
  adresse: string
  telephone: string
  email: string
  status: StudentRibStatus
  statusLabel: string
  submittedAt: string | null
  reviewedAt: string | null
  reviewComment: string | null
}

/** RIB actif (versements), demande de modification en attente, dernier refus. */
export type StudentRibState = {
  active: StudentRib | null
  pending: StudentRib | null
  lastRejected: StudentRib | null
}

export type StudentCursus = {
  studentId: string
  annee: string
  etablissement: string
  niveau: string
  niveauCode: string | null
  niveauLibelle: string
  resultat: 'PASSED' | 'REPEATED' | 'FAILED' | null
  specialite: string
  diplome: string
  statut: string
  actuel: boolean
}

export type StudentPayment = {
  studentId: string
  mois: string
  annee: string
  date: string
  montant: string
  devise: string
  base: string
  statut: string
  status: 'PAID' | 'PENDING' | 'CANCELLED'
  /** Montants bruts (chaîne décimale), à formater selon la devise. */
  amount: string
  baseAmount: string
  paidAt: string
}

export type StudentDocument = {
  id: string
  studentId: string
  nom: string
  type: string
  status: StudentDocumentStatus
  statusLabel: string
  statut: StudentDocumentStatus
  obligatoire: boolean
  dateDepot: string | null
  originalName?: string | null
  mimeType?: string | null
  size?: number | null
  reviewedAt?: string | null
  reviewComment?: string | null
  isDownloadable: boolean
}

export type DocumentTypeOption = {
  code: string
  label: string
  description: string | null
}

export type ListResponse<T> = { items: T[] }

export type LoginResponse = {
  success: boolean
  student: StudentProfile
}

export type UpdateStudentRibPayload = {
  banque: string
  iban: string
  bic?: string
  adresse?: string
  telephone?: string
  email?: string
}

export type RequestSummary = {
  id: string
  reference: string
  type: 'RENEWAL' | 'NEW_APPLICATION'
  status: string
  statusLabel: string
  campaignTitle: string
  targetLevel: string | null
  targetLevelLabel: string | null
  submittedAt: string | null
  decidedAt: string | null
  updatedAt: string
}

export type CampaignPhase = 'UPCOMING' | 'OPEN' | 'CLOSED'

export type CampaignView = {
  id: string
  type: 'RENEWAL' | 'NEW_APPLICATION'
  title: string
  instructions: string | null
  academicYear: { id: string; code: string; label: string }
  opensAt: string
  closesAt: string
  closedAt: string | null
  maxAgeNonDoctoral: number | null
  phase: CampaignPhase
  phaseLabel: string
  requirements: Array<{
    documentTypeCode: string
    label: string
    description: string | null
    cycles: string[]
    isRequired: boolean
  }>
}

export type EligibilityIssue = { code: string; message: string }

export type Eligibility = {
  eligible: boolean
  blockers: EligibilityIssue[]
  warnings: EligibilityIssue[]
}

export type CurrentCampaign = {
  campaign: CampaignView | null
  request: RequestSummary | null
  eligibility: Eligibility | null
}

/** Synthèse calculée par l'API : aucune donnée codée en dur côté interface. */
export type StudentDashboard = {
  student: {
    firstName: string
    lastName: string
    studentNumber: string
    matricule: string | null
    level: string | null
    levelCode: string | null
    field: string | null
    academy: string | null
    country: string | null
    academicYear: string | null
  }
  scholarship: {
    status: string
    statusLabel: string
    type: string | null
    paymentMethod: string | null
    startDate: string | null
    endDate: string | null
    progressPercent: number | null
    monthlyAllocation: string | null
    monthlyAllocationCfa: number | null
    currency: string
    attributionNumber: string | null
  }
  payments: {
    currentYearCount: number
    currentYearTotal: string
    currency: string
    last: { month: string; academicYear: string; amount: string; currency: string; paidAt: string } | null
    nextEstimatedAt: string | null
  }
  documents: {
    toProvide: Array<{ id: string; name: string; status: 'REQUIRED' | 'REJECTED'; reviewComment: string | null }>
  }
  rib: {
    active: { bankName: string; ibanMasked: string } | null
    hasPendingChange: boolean
  }
  renewal: CurrentCampaign
  notifications: {
    unreadCount: number
    latest: NotificationItem[]
  }
}

export const getStudentDashboard = () => requestJson<StudentDashboard>('/student/dashboard')

export const getMe = () => requestJson<StudentProfile>('/me')

export const login = (identifier: string, password: string) =>
  sendJson<LoginResponse>('/auth/login', 'POST', { identifier, password })

export const logout = () => sendJson<{ success: boolean }>('/auth/logout', 'POST')

export const getStudentProfile = () => requestJson<StudentProfile>('/student/profile')

export const getStudentRib = () => requestJson<StudentRibState>('/student/rib')

export const updateStudentRib = (payload: UpdateStudentRibPayload) =>
  sendJson<StudentRibState>('/student/rib', 'PATCH', payload)

export const cancelPendingStudentRib = () =>
  sendJson<StudentRibState>('/student/rib/pending', 'DELETE')

export const getStudentCursus = () => requestJson<ListResponse<StudentCursus>>('/student/cursus')

export const getStudentPayments = () =>
  requestJson<ListResponse<StudentPayment>>('/student/payments')

export const getStudentDocuments = () =>
  requestJson<ListResponse<StudentDocument>>('/student/documents')

export const getDocumentTypes = () =>
  requestJson<ListResponse<DocumentTypeOption>>('/student/document-types')

export const uploadStudentDocument = (formData: FormData) =>
  sendForm<StudentDocument>('/student/documents', formData)

export const cancelStudentDocumentSubmission = (documentId: string) =>
  sendJson<ListResponse<StudentDocument>>(`/student/documents/${documentId}/submission`, 'DELETE')

export const downloadStudentDocument = (documentId: string) =>
  downloadFile(`/student/documents/${documentId}/download`)
