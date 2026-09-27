import type { ReactNode } from 'react'

export function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="login-shell">
        <p className="inline-state" role="status">
          {children}
        </p>
      </main>
    </>
  )
}
