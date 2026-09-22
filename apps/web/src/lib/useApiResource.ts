import { useCallback, useEffect, useState } from 'react'

export type ApiResourceState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Charge une ressource au montage (et à chaque `reload`). `load` doit être stable
 * (fonction de module ou `useCallback`), sinon la requête serait relancée à chaque rendu.
 */
export function useApiResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<ApiResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true

    load()
      .then((result) => {
        if (active) {
          setState({ data: result, loading: false, error: null })
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setState({
            data: null,
            loading: false,
            error: reason instanceof Error ? reason : new Error('Requête impossible'),
          })
        }
      })

    return () => {
      active = false
    }
  }, [load, version])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true }))
    setVersion((current) => current + 1)
  }, [])

  /** Remplace les données localement (réponse d'une mutation) sans nouvel appel. */
  const setData = useCallback((data: T) => {
    setState({ data, loading: false, error: null })
  }, [])

  return { ...state, reload, setData }
}
