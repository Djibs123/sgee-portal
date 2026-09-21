import type { Request } from 'express';
import type { ClientMeta } from '../../auth/session/session.service';

/** IP (respecte `trust proxy`) et user-agent, pour les sessions et l'audit. */
export function clientMeta(request: Request): ClientMeta {
  return {
    ip: request.ip ?? null,
    userAgent: request.get('user-agent') ?? null,
  };
}
