import type { CookieOptions } from 'express';
import { env } from '../config/env';

export const isProduction = env.isProduction;
export const AUTH_COOKIE_NAME = env.AUTH_COOKIE_NAME;
export const AUTH_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 8;

// SameSite=strict : le portail et l'API sont servis depuis le même site ; le cookie
// n'est jamais envoyé depuis un site tiers (défense CSRF en profondeur).
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
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

export const JWT_SECRET = env.JWT_SECRET;

export const JWT_EXPIRES_IN = '8h';
