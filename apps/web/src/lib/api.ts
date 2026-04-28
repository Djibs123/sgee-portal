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
}

export type StudentRib = {
  studentId: string
  status: string
  bankName: string
  ibanMasked: string
  updatedAt: string | null
}

export type StudentCursus = {
  studentId: string
  academicYear: string
  institution: string
  level: string
  field: string
  status: string
}

export type StudentCursusResponse = {
  items: StudentCursus[]
}

export type StudentPayment = {
  studentId: string
  reference: string
  amount: number
  currency: string
  status: string
  paidAt: string | null
}

export type StudentPaymentsResponse = {
  items: StudentPayment[]
}

export type StudentDocument = {
  studentId: string
  type: string
  label: string
  status: string
  uploadedAt: string | null
}

export type StudentDocumentsResponse = {
  items: StudentDocument[]
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
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
