export function InlineState({
  loading,
  error,
}: {
  loading: boolean
  error: Error | null
}) {
  if (loading) {
    return <p style={{ color: 'var(--text-3)' }}>Chargement...</p>
  }

  if (error) {
    return (
      <p style={{ color: 'var(--red-sn)' }}>
        Les donnees sont temporairement indisponibles.
      </p>
    )
  }

  return null
}
