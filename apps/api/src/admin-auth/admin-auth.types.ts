import type { AdminRole } from '@prisma/client';
import type { Request } from 'express';

export type AdminAuthTokenPayload = {
  sub: string;
  adminId: string;
  email: string;
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
    typeof payload.adminId === 'string' &&
    typeof payload.email === 'string' &&
    (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN') &&
    payload.sub === payload.adminId
  );
};
