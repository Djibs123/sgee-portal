import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME, JWT_SECRET } from './auth.constants';
import type { AuthenticatedRequest, AuthTokenPayload } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[AUTH_COOKIE_NAME];

    if (typeof token !== 'string' || token.trim() === '') {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      request.auth = await this.jwtService.verifyAsync<AuthTokenPayload>(
        token,
        {
          secret: JWT_SECRET,
        },
      );

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
