import type { CookieOptions } from 'express';

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'sgee_session';

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/',
  maxAge: 1000 * 60 * 60 * 8,
};

export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-sgee-portal-change-me';

export const JWT_EXPIRES_IN = '8h';
