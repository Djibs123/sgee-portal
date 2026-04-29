import type { CookieOptions } from 'express';

const DEV_JWT_SECRET = 'dev-sgee-portal-change-me';

export const isProduction = process.env.NODE_ENV === 'production';
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'sgee_session';
export const AUTH_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 8;

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
  maxAge: AUTH_COOKIE_MAX_AGE_MS,
};

export const AUTH_COOKIE_CLEAR_OPTIONS: CookieOptions = {
  httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
  sameSite: AUTH_COOKIE_OPTIONS.sameSite,
  secure: AUTH_COOKIE_OPTIONS.secure,
  path: AUTH_COOKIE_OPTIONS.path,
};

export const JWT_SECRET = process.env.JWT_SECRET ?? DEV_JWT_SECRET;

export const JWT_EXPIRES_IN = '8h';

if (
  isProduction &&
  (!process.env.JWT_SECRET ||
    process.env.JWT_SECRET === DEV_JWT_SECRET ||
    process.env.JWT_SECRET.length < 32)
) {
  throw new Error('JWT_SECRET must be set to a strong value in production');
}
