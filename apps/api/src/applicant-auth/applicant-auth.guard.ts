import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from '../auth/auth.constants';
import { SessionService } from '../auth/session/session.service';
import {
  APPLICANT_AUTH_COOKIE_NAME,
  isApplicantTokenPayload,
  type AuthenticatedApplicantRequest,
} from './applicant-auth.types';

const SESSION_ERROR = 'Session candidat invalide ou expirée';

/** JWT signé + session serveur de type APPLICANT (révocable, inactivité 60 min). */
@Injectable()
export class ApplicantAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedApplicantRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[APPLICANT_AUTH_COOKIE_NAME];

    if (typeof token !== 'string' || token === '') {
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

    if (
      !isApplicantTokenPayload(payload) ||
      !(await this.sessions.validate(
        payload.sid,
        'APPLICANT',
        payload.applicantId,
      ))
    ) {
      throw new UnauthorizedException(SESSION_ERROR);
    }

    request.applicant = payload;

    return true;
  }
}

export const CurrentApplicant = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedApplicantRequest>()
      .applicant,
);
