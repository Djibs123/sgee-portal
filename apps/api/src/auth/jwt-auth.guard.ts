import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME, JWT_SECRET } from './auth.constants';
import { isAuthTokenPayload, type AuthenticatedRequest } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[AUTH_COOKIE_NAME];

    if (typeof token !== 'string' || token.trim() === '') {
      throw new UnauthorizedException('Session invalide ou expiree');
    }

    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(token, {
        secret: JWT_SECRET,
      });

      if (!isAuthTokenPayload(payload)) {
        throw new UnauthorizedException('Session invalide ou expiree');
      }

      request.auth = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Session invalide ou expiree');
    }
  }
}
