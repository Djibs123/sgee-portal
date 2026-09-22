type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  label?: string
}

export function Pagination({ page, pageSize, total, onChange, label = 'Pagination' }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  if (pageCount <= 1) {
    return null
  }

  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" className="btn btn-secondary" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Précédent
      </button>
      <span aria-live="polite">
        Page {page} sur {pageCount}
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
      >
        Suivant
      </button>
    </nav>
  )
}
