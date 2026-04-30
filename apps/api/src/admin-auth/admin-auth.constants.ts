import type { CookieOptions } from 'express';
import { isProduction } from '../auth/auth.constants';

const DEV_ADMIN_JWT_SECRET = 'dev-sgee-admin-change-me';

export const ADMIN_AUTH_COOKIE_NAME =
  process.env.ADMIN_AUTH_COOKIE_NAME ?? 'sgee_admin_session';
export const ADMIN_AUTH_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 8;

export const ADMIN_AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
  maxAge: ADMIN_AUTH_COOKIE_MAX_AGE_MS,
};

export const ADMIN_AUTH_COOKIE_CLEAR_OPTIONS: CookieOptions = {
  httpOnly: ADMIN_AUTH_COOKIE_OPTIONS.httpOnly,
  sameSite: ADMIN_AUTH_COOKIE_OPTIONS.sameSite,
  secure: ADMIN_AUTH_COOKIE_OPTIONS.secure,
  path: ADMIN_AUTH_COOKIE_OPTIONS.path,
};

export const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ?? DEV_ADMIN_JWT_SECRET;

export const ADMIN_JWT_EXPIRES_IN = '8h';

if (
  isProduction &&
  (!process.env.ADMIN_JWT_SECRET ||
    process.env.ADMIN_JWT_SECRET === DEV_ADMIN_JWT_SECRET ||
    process.env.ADMIN_JWT_SECRET.length < 32)
) {
  throw new Error(
    'ADMIN_JWT_SECRET must be set to a strong value in production',
  );
}
