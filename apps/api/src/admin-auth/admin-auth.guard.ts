import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_JWT_SECRET,
} from './admin-auth.constants';
import {
  isAdminAuthTokenPayload,
  type AuthenticatedAdminRequest,
} from './admin-auth.types';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedAdminRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[ADMIN_AUTH_COOKIE_NAME];

    if (typeof token !== 'string' || token.trim() === '') {
      throw new UnauthorizedException('Session admin invalide ou expiree');
    }

    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(token, {
        secret: ADMIN_JWT_SECRET,
      });

      if (!isAdminAuthTokenPayload(payload)) {
        throw new UnauthorizedException('Session admin invalide ou expiree');
      }

      request.admin = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Session admin invalide ou expiree');
    }
  }
}
