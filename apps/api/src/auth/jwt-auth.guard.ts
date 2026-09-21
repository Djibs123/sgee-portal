import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME, JWT_SECRET } from './auth.constants';
import { isAuthTokenPayload, type AuthenticatedRequest } from './auth.types';
import { SessionService } from './session/session.service';

const SESSION_ERROR = 'Session invalide ou expirée';

/** Vérifie la signature du JWT puis l'état de la session serveur (révocation, inactivité). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[AUTH_COOKIE_NAME];

    if (typeof token !== 'string' || token.trim() === '') {
      throw new UnauthorizedException(SESSION_ERROR);
    }

    let payload: Record<string, unknown>;

    try {
      payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
        token,
        { secret: JWT_SECRET },
      );
    } catch {
      throw new UnauthorizedException(SESSION_ERROR);
    }

    if (!isAuthTokenPayload(payload)) {
      throw new UnauthorizedException(SESSION_ERROR);
    }

    const session = await this.sessions.validate(
      payload.sid,
      'STUDENT',
      payload.studentId,
    );

    if (!session) {
      throw new UnauthorizedException(SESSION_ERROR);
    }

    request.auth = payload;

    return true;
  }
}
