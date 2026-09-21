import type { CookieOptions, Request } from 'express';
import { AUTH_COOKIE_OPTIONS } from '../auth/auth.constants';

export const APPLICANT_AUTH_COOKIE_NAME = 'sgee_applicant_session';

export const APPLICANT_AUTH_COOKIE_OPTIONS: CookieOptions = AUTH_COOKIE_OPTIONS;

export const APPLICANT_AUTH_COOKIE_CLEAR_OPTIONS: CookieOptions = {
  httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
  sameSite: AUTH_COOKIE_OPTIONS.sameSite,
  secure: AUTH_COOKIE_OPTIONS.secure,
  path: AUTH_COOKIE_OPTIONS.path,
};

export type ApplicantTokenPayload = {
  sub: string;
  sid: string;
  applicantId: string;
  typ: 'applicant';
};

export type AuthenticatedApplicantRequest = Request & {
  applicant?: ApplicantTokenPayload;
};

export const isApplicantTokenPayload = (
  value: unknown,
): value is ApplicantTokenPayload => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    payload.typ === 'applicant' &&
    typeof payload.sub === 'string' &&
    typeof payload.sid === 'string' &&
    payload.applicantId === payload.sub
  );
};
