import type { AdminRole } from '../generated/prisma/client';
import type { Request } from 'express';

export type AdminAuthTokenPayload = {
  sub: string;
  /** Identifiant de la session serveur (révocable). */
  sid: string;
  adminId: string;
  email: string;
  /** Rôle courant, relu en base à chaque requête par `AdminAuthGuard`. */
  role: AdminRole;
};

export type AuthenticatedAdminRequest = Request & {
  admin?: AdminAuthTokenPayload;
};

export const isAdminAuthTokenPayload = (
  value: unknown,
): value is AdminAuthTokenPayload => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.sub === 'string' &&
    typeof payload.sid === 'string' &&
    typeof payload.adminId === 'string' &&
    typeof payload.email === 'string' &&
    (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN') &&
    payload.sub === payload.adminId
  );
};
