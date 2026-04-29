import type { Request } from 'express';

export type AuthTokenPayload = {
  sub: string;
  studentId: string;
  codeEtudiant: string;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthTokenPayload;
};

export const isAuthTokenPayload = (
  value: unknown,
): value is AuthTokenPayload => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.sub === 'string' &&
    typeof payload.studentId === 'string' &&
    typeof payload.codeEtudiant === 'string' &&
    payload.sub === payload.studentId
  );
};
