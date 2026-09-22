export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:3000/api'

export class ApiError extends Error {
  readonly status: number
  readonly responseBody: unknown

  constructor(message: string, status: number, responseBody: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.responseBody = responseBody
  }
}

export type SessionScope = 'student' | 'admin' | 'applicant'

/** Événement émis quand une session expire en cours d'utilisation (réponse 401). */
export const SESSION_EXPIRED_EVENT = 'sgee:session-expired'

const SAFE_METHODS = new Set(['GET', 'HEAD'])

// L'API refuse toute requête modifiante sans cet en-tête (protection CSRF).
const CSRF_HEADERS = { 'X-SGEE-CSRF': '1' }

// Tentatives de connexion et vérifications de session : un 401 y est attendu.
const SILENT_401_PATHS = new Set([
  '/auth/login',
  '/admin/auth/login',
  '/applicant/auth/login',
  '/me',
  '/admin/me',
  '/applicant/me',
])

function scopeOf(path: string): SessionScope {
  if (path.startsWith('/admin')) {
    return 'admin'
  }

  return path.startsWith('/applicant') ? 'applicant' : 'student'
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

async function send(path: string, init: RequestInit = {}) {
  const method = (init.method ?? 'GET').toUpperCase()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(SAFE_METHODS.has(method) ? {} : CSRF_HEADERS),
      ...init.headers,
    },
  })

  if (!response.ok) {
    const body = await readResponseBody(response)

    if (response.status === 401 && !SILENT_401_PATHS.has(path)) {
      window.dispatchEvent(
        new CustomEvent<SessionScope>(SESSION_EXPIRED_EVENT, { detail: scopeOf(path) }),
      )
    }

    throw new ApiError(`API request failed with status ${response.status}`, response.status, body)
  }

  return response
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init)

  return (await readResponseBody(response)) as T
}

/** Requête JSON modifiante (POST, PATCH, DELETE…). */
export function sendJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  return requestJson<T>(path, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
}

/** Envoi multipart (pièces justificatives). */
export function sendForm<T>(path: string, formData: FormData): Promise<T> {
  return requestJson<T>(path, { method: 'POST', body: formData })
}

export type DownloadedFile = {
  blob: Blob
  fileName: string
}

function fileNameFromDisposition(disposition: string | null) {
  const utf8Match = disposition?.match(/filename\*=UTF-8''([^;]+)/i)

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  return disposition?.match(/filename="([^"]+)"/i)?.[1] ?? 'document'
}

export async function downloadFile(path: string): Promise<DownloadedFile> {
  const response = await send(path, { headers: { Accept: 'application/octet-stream' } })

  return {
    blob: await response.blob(),
    fileName: fileNameFromDisposition(response.headers.get('Content-Disposition')),
  }
}

/** Déclenche l'enregistrement du fichier par le navigateur. */
export function saveDownloadedFile({ blob, fileName }: DownloadedFile) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Message d'erreur lisible renvoyé par l'API (Nest), sinon le message par défaut. */
export function getApiErrorMessage(reason: unknown, fallback: string) {
  if (!(reason instanceof ApiError) || typeof reason.responseBody !== 'object' || reason.responseBody === null) {
    return fallback
  }

  const message = (reason.responseBody as { message?: unknown }).message

  if (typeof message === 'string' && message.trim() !== '') {
    return message
  }

  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message.join('. ')
  }

  return fallback
}
