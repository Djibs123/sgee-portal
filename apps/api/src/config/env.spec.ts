import { validateEnv } from './env';

const strong = (seed: string) => seed.repeat(40);

describe('validateEnv', () => {
  const base = { DATABASE_URL: 'postgresql://localhost/db' };

  it('applique des valeurs par défaut sûres en développement', () => {
    const env = validateEnv({ ...base });

    expect(env.PORT).toBe(3000);
    expect(env.isProduction).toBe(false);
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.FRONTEND_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('refuse une configuration sans DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('refuse les secrets faibles en production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /JWT_SECRET, ADMIN_JWT_SECRET/,
    );
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        JWT_SECRET: strong('a'),
        ADMIN_JWT_SECRET: strong('a'),
      }),
    ).toThrow(/différents/);
  });

  it('accepte une configuration de production complète', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: strong('a'),
      ADMIN_JWT_SECRET: strong('b'),
      FRONTEND_ORIGIN: 'https://portail.sgee.sn/, https://admin.sgee.sn',
      TRUST_PROXY: '1',
      PORT: '8080',
    });

    expect(env.isProduction).toBe(true);
    expect(env.PORT).toBe(8080);
    expect(env.TRUST_PROXY).toBe(1);
    expect(env.FRONTEND_ORIGINS).toEqual([
      'https://portail.sgee.sn',
      'https://admin.sgee.sn',
    ]);
  });
});
