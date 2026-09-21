import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { env } from '../../config/env';

export const CSRF_HEADER = 'x-sgee-csrf';
export const CSRF_HEADER_VALUE = '1';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protection CSRF pour une API JSON authentifiée par cookie (OWASP CSRF Cheat Sheet) :
 * - en-tête personnalisé obligatoire : un site tiers ne peut pas l'envoyer sans
 *   pré-vérification CORS, refusée pour toute origine hors liste blanche ;
 * - Fetch Metadata : `Sec-Fetch-Site: cross-site` est refusé ;
 * - si l'en-tête `Origin` est présent, il doit appartenir à la liste blanche.
 * Les cookies de session sont en plus `SameSite=strict`.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    if (request.get('sec-fetch-site') === 'cross-site') {
      throw new ForbiddenException('Requête inter-sites refusée');
    }

    const origin = request.get('origin');

    if (origin && !env.FRONTEND_ORIGINS.includes(origin.replace(/\/$/, ''))) {
      throw new ForbiddenException('Origine non autorisée');
    }

    if (request.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
      throw new ForbiddenException('En-tête anti-CSRF manquant');
    }

    return true;
  }
}
