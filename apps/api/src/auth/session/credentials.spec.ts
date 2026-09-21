import bcrypt from 'bcryptjs';
import {
  checkCredentials,
  isLocked,
  LOCK_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  registerFailure,
} from './credentials';

const now = new Date('2026-09-21T10:00:00Z');

describe('verrouillage de compte', () => {
  it('verrouille 15 minutes au 5e échec consécutif', () => {
    let state = { failedLoginAttempts: 0, lockedUntil: null as Date | null };

    for (let attempt = 1; attempt < MAX_FAILED_LOGIN_ATTEMPTS; attempt += 1) {
      state = registerFailure(state, now);
      expect(state.lockedUntil).toBeNull();
    }

    state = registerFailure(state, now);

    expect(state.lockedUntil?.getTime()).toBe(now.getTime() + LOCK_DURATION_MS);
    expect(state.failedLoginAttempts).toBe(0);
    expect(isLocked(state, now)).toBe(true);
    expect(
      isLocked(state, new Date(now.getTime() + LOCK_DURATION_MS + 1)),
    ).toBe(false);
  });
});

describe('checkCredentials', () => {
  const passwordHash = bcrypt.hashSync('bon-mot-de-passe', 4);
  const account = { passwordHash, failedLoginAttempts: 0, lockedUntil: null };

  it('accepte le bon mot de passe', async () => {
    await expect(
      checkCredentials(account, 'bon-mot-de-passe', now),
    ).resolves.toEqual({ outcome: 'ok' });
  });

  it("renvoie l'état d'échec à persister", async () => {
    const result = await checkCredentials(account, 'mauvais', now);

    expect(result).toEqual({
      outcome: 'invalid',
      nextState: { failedLoginAttempts: 1, lockedUntil: null },
    });
  });

  it('refuse un compte verrouillé même avec le bon mot de passe', async () => {
    const locked = {
      ...account,
      lockedUntil: new Date(now.getTime() + 60_000),
    };

    await expect(
      checkCredentials(locked, 'bon-mot-de-passe', now),
    ).resolves.toEqual({ outcome: 'locked' });
  });

  it('refuse un compte inexistant ou sans mot de passe', async () => {
    await expect(checkCredentials(null, 'x', now)).resolves.toEqual({
      outcome: 'invalid',
    });
    await expect(
      checkCredentials({ ...account, passwordHash: null }, 'x', now),
    ).resolves.toMatchObject({ outcome: 'invalid' });
  });
});
