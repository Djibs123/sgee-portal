import type { ReactNode } from 'react'

export function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flag-strip" aria-hidden="true"><span /><span /><span /></div>
      <main className="login-shell">
        <p className="inline-state" role="status">
          {children}
        </p>
      </main>
    </>
  )
}
