const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:3000/api'

export class ApiError extends Error {
  readonly status: number
  readonly responseBody: unknown

  constructor(
    message: string,
    status: number,
    responseBody: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.responseBody = responseBody
  }
}

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

export type StudentRib = {
  studentId: string
  banque: string
  titulaire: string
  iban: string
  bic: string
  adresse: string
  telephone: string
  email: string
  status: string
  ibanMasked: string
  updatedAt: string | null
}

export type StudentCursus = {
  studentId: string
  annee: string
  etablissement: string
  niveau: string
  specialite: string
  diplome: string
  statut: string
  actuel: boolean
}

export type StudentCursusResponse = {
  items: StudentCursus[]
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
}

export type StudentPaymentsResponse = {
  items: StudentPayment[]
}

export type StudentDocument = {
  studentId: string
  nom: string
  type: string
  statut: string
  obligatoire: boolean
  dateDepot: string | null
}

export type StudentDocumentsResponse = {
  items: StudentDocument[]
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })
  const responseBody: unknown = await readResponseBody(response)

  if (!response.ok) {
    throw new ApiError(
      `API request failed with status ${response.status}`,
      response.status,
      responseBody,
    )
  }

  return responseBody as T
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()

  if (text === '') {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export function getMe(): Promise<StudentProfile> {
  return requestJson<StudentProfile>('/me')
}

export function getStudentProfile(): Promise<StudentProfile> {
  return requestJson<StudentProfile>('/student/profile')
}

export function getStudentRib(): Promise<StudentRib> {
  return requestJson<StudentRib>('/student/rib')
}

export function getStudentCursus(): Promise<StudentCursusResponse> {
  return requestJson<StudentCursusResponse>('/student/cursus')
}

export function getStudentPayments(): Promise<StudentPaymentsResponse> {
  return requestJson<StudentPaymentsResponse>('/student/payments')
}

export function getStudentDocuments(): Promise<StudentDocumentsResponse> {
  return requestJson<StudentDocumentsResponse>('/student/documents')
}

export function logout(): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  })
}
