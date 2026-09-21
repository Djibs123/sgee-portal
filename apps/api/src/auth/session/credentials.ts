import bcrypt from 'bcryptjs';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

/**
 * Hash bcrypt (coût 12) d'une valeur aléatoire jetée : comparé lorsque le compte
 * n'existe pas ou est verrouillé, pour que le temps de réponse ne révèle rien.
 */
const DUMMY_BCRYPT_HASH =
  '$2b$12$HCUUE3MwHyjk2qIocf0Xs.Ec0yWrYI9RyRsEWqK/Whu23TVhDx5mq';

export type LockState = {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

export type LockableAccount = LockState & {
  passwordHash: string | null;
};

export type CredentialCheck =
  { outcome: 'ok' } | { outcome: 'invalid' | 'locked'; nextState?: LockState };

export function isLocked(state: LockState, now: Date) {
  return state.lockedUntil !== null && state.lockedUntil > now;
}

/** État après un échec : verrouillage temporaire au 5e échec consécutif. */
export function registerFailure(state: LockState, now: Date): LockState {
  const attempts = state.failedLoginAttempts + 1;

  if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return {
      failedLoginAttempts: 0,
      lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
    };
  }

  return { failedLoginAttempts: attempts, lockedUntil: null };
}

async function verifyPassword(password: string, hash: string | null) {
  const matches = await bcrypt.compare(password, hash ?? DUMMY_BCRYPT_HASH);

  return hash !== null && matches;
}

/**
 * Vérifie un mot de passe en temps constant, que le compte existe ou non.
 * `nextState` indique l'état de verrouillage à persister après un échec.
 */
export async function checkCredentials(
  account: LockableAccount | null,
  password: string,
  now: Date,
): Promise<CredentialCheck> {
  if (!account || isLocked(account, now)) {
    await verifyPassword(password, null);

    return { outcome: account ? 'locked' : 'invalid' };
  }

  if (await verifyPassword(password, account.passwordHash)) {
    return { outcome: 'ok' };
  }

  const nextState = registerFailure(account, now);

  return {
    outcome: nextState.lockedUntil ? 'locked' : 'invalid',
    nextState,
  };
}
