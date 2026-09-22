import { render } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { vi } from 'vitest'
import { routes } from '../router'

/** Réponse simulée : corps JSON (200), `{ status, body }`, ou fonction de la requête et de l'URL. */
export type Reply = unknown | { status: number; body: unknown } | ((init: RequestInit | undefined, url: URL) => unknown)

const isStatusReply = (value: unknown): value is { status: number; body: unknown } =>
  typeof value === 'object' && value !== null && 'status' in value && 'body' in value && Object.keys(value).length === 2

/** Remplace `fetch` par une table « MÉTHODE /chemin » → réponse ; route absente = 404. */
export function mockApi(table: Record<string, Reply>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const path = url.replace(/^.*\/api/, '').split('?')[0]
    const reply = table[`${init?.method ?? 'GET'} ${path}`]
    const resolved =
      typeof reply === 'function'
        ? (reply as (init: RequestInit | undefined, url: URL) => unknown)(init, new URL(url, 'http://localhost'))
        : reply
    const { status, body } = isStatusReply(resolved)
      ? resolved
      : { status: resolved === undefined ? 404 : 200, body: resolved ?? { message: 'introuvable' } }

    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

export type FetchMock = ReturnType<typeof mockApi>

/** Corps JSON du premier appel correspondant. */
export function bodyOf(fetchMock: FetchMock, method: string, path: string) {
  const call = fetchMock.mock.calls.find(([url, init]) => url.endsWith(path) && init?.method === method)

  return call ? JSON.parse(String(call[1]?.body)) : undefined
}

export function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  render(<RouterProvider router={router} />)

  return router
}
