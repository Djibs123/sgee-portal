import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Lit le jeton à usage unique d'un lien reçu par e-mail puis le retire de l'URL :
 * il ne reste ni dans l'historique ni dans un éventuel en-tête `Referer`.
 */
export function useUrlToken() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [token] = useState(() => searchParams.get('token'))

  useEffect(() => {
    if (searchParams.has('token')) {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return token
}
