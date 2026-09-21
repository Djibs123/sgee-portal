import type { CookieOptions } from 'express';
import { AUTH_COOKIE_OPTIONS } from '../auth/auth.constants';
import { env } from '../config/env';

export const ADMIN_AUTH_COOKIE_NAME = env.ADMIN_AUTH_COOKIE_NAME;
export const ADMIN_AUTH_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 8;

export const ADMIN_AUTH_COOKIE_OPTIONS: CookieOptions = {
  ...AUTH_COOKIE_OPTIONS,
  maxAge: ADMIN_AUTH_COOKIE_MAX_AGE_MS,
};

export const ADMIN_AUTH_COOKIE_CLEAR_OPTIONS: CookieOptions = {
  httpOnly: ADMIN_AUTH_COOKIE_OPTIONS.httpOnly,
  sameSite: ADMIN_AUTH_COOKIE_OPTIONS.sameSite,
  secure: ADMIN_AUTH_COOKIE_OPTIONS.secure,
  path: ADMIN_AUTH_COOKIE_OPTIONS.path,
};

export const ADMIN_JWT_SECRET = env.ADMIN_JWT_SECRET;

export const ADMIN_JWT_EXPIRES_IN = '8h';
