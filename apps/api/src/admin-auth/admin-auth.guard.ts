import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AdminRole } from '@prisma/client';
import { SessionService } from '../auth/session/session.service';
import {
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_JWT_SECRET,
} from './admin-auth.constants';
import {
  isAdminAuthTokenPayload,
  type AuthenticatedAdminRequest,
} from './admin-auth.types';
import { ROLES_KEY } from './roles.decorator';

const SESSION_ERROR = 'Session admin invalide ou expirée';

/** Authentifie l'admin (JWT + session serveur) puis applique `@Roles()`. */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessions: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedAdminRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[ADMIN_AUTH_COOKIE_NAME];

    if (typeof token !== 'string' || token.trim() === '') {
      throw new UnauthorizedException(SESSION_ERROR);
    }

    let payload: Record<string, unknown>;

    try {
      payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
        token,
        { secret: ADMIN_JWT_SECRET },
      );
    } catch {
      throw new UnauthorizedException(SESSION_ERROR);
    }

    if (!isAdminAuthTokenPayload(payload)) {
      throw new UnauthorizedException(SESSION_ERROR);
    }

    const session = await this.sessions.validate(
      payload.sid,
      'ADMIN',
      payload.adminId,
    );

    if (!session?.adminRole) {
      throw new UnauthorizedException(SESSION_ERROR);
    }

    const requiredRoles = this.reflector.getAllAndOverride<
      AdminRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (
      requiredRoles?.length &&
      session.adminRole !== 'SUPER_ADMIN' &&
      !requiredRoles.includes(session.adminRole)
    ) {
      throw new ForbiddenException('Droits insuffisants');
    }

    request.admin = { ...payload, role: session.adminRole };

    return true;
  }
}
