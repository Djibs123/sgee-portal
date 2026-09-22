import { Link } from 'react-router'

export function Breadcrumb({ label }: { label: string }) {
  return (
    <nav className="breadcrumb" aria-label="Fil d’Ariane">
      <Link to="/portal">Espace boursier</Link>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 18l6-6-6-6" />
      </svg>
      <span aria-current="page">{label}</span>
    </nav>
  )
}
