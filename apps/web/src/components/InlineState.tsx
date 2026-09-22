/** État de chargement ou d'erreur d'une page, annoncé aux technologies d'assistance. */
export function InlineState({ loading, error }: { loading: boolean; error: Error | null }) {
  if (loading) {
    return (
      <p className="inline-state" role="status">
        Chargement…
      </p>
    )
  }

  if (error) {
    return (
      <p className="inline-state error" role="alert">
        Les données sont temporairement indisponibles. Réessayez dans quelques instants.
      </p>
    )
  }

  return null
}
