import type { ReactNode } from 'react'

/** Données en lecture seule : liste de définitions (et non des `<label>` sans champ). */
export function InfoList({ children }: { children: ReactNode }) {
  return <dl className="info-grid">{children}</dl>
}

export function InfoItem({
  label,
  children,
  mono = false,
}: {
  label: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className="info-field">
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined}>{children || '—'}</dd>
    </div>
  )
}
