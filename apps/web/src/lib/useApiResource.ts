import { useEffect, useState } from 'react'

export type ApiResourceState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useApiResource<T>(load: () => Promise<T>): ApiResourceState<T> {
  const [state, setState] = useState<ApiResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true

    load()
      .then((result) => {
        if (active) {
          setState({
            data: result,
            loading: false,
            error: null,
          })
        }
      })
      .catch((reason: unknown) => {
        const nextError =
          reason instanceof Error ? reason : new Error('API request failed')
        console.error(nextError)

        if (active) {
          setState({
            data: null,
            loading: false,
            error: nextError,
          })
        }
      })

    return () => {
      active = false
    }
  }, [load])

  return state
}
