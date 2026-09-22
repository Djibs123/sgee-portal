import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { SESSION_EXPIRED_EVENT, type SessionScope } from '../lib/api'

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous'

export type SessionValue<Profile> = {
  profile: Profile | null
  status: SessionStatus
  /** Vrai si la session a expiré en cours d'utilisation (message sur la page de connexion). */
  expired: boolean
  signIn: (profile: Profile) => void
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Contexte de session par espace (boursier, admin, candidat) : vérification unique
 * au montage, mise à jour après connexion, réaction aux sessions expirées.
 */
export function createSession<Profile>(
  scope: SessionScope,
  fetchProfile: () => Promise<Profile>,
  logoutRequest: () => Promise<unknown>,
) {
  const SessionContext = createContext<SessionValue<Profile> | null>(null)

  function SessionProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [status, setStatus] = useState<SessionStatus>('loading')
    const [expired, setExpired] = useState(false)

    const refresh = useCallback(async () => {
      try {
        setProfile(await fetchProfile())
        setStatus('authenticated')
      } catch {
        setProfile(null)
        setStatus('anonymous')
      }
    }, [])

    useEffect(() => {
      let active = true

      fetchProfile()
        .then((nextProfile) => {
          if (active) {
            setProfile(nextProfile)
            setStatus('authenticated')
          }
        })
        .catch(() => {
          if (active) {
            setStatus('anonymous')
          }
        })

      const onExpired = (event: Event) => {
        if ((event as CustomEvent<SessionScope>).detail === scope) {
          setProfile(null)
          setStatus('anonymous')
          setExpired(true)
        }
      }

      window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)

      return () => {
        active = false
        window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
      }
    }, [])

    const signIn = useCallback((nextProfile: Profile) => {
      setProfile(nextProfile)
      setStatus('authenticated')
      setExpired(false)
    }, [])

    const signOut = useCallback(async () => {
      try {
        await logoutRequest()
      } finally {
        setProfile(null)
        setStatus('anonymous')
      }
    }, [])

    const value = useMemo(
      () => ({ profile, status, expired, signIn, signOut, refresh }),
      [profile, status, expired, signIn, signOut, refresh],
    )

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  }

  function useSession() {
    const value = useContext(SessionContext)

    if (!value) {
      throw new Error(`Session ${scope} utilisée hors de son fournisseur`)
    }

    return value
  }

  return { SessionProvider, useSession }
}
