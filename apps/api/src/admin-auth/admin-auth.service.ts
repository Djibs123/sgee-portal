import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AdminUser } from '../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { checkCredentials } from '../auth/session/credentials';
import {
  SessionService,
  type ClientMeta,
} from '../auth/session/session.service';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN_JWT_EXPIRES_IN, ADMIN_JWT_SECRET } from './admin-auth.constants';
import type { AdminLoginDto } from './admin-auth.dto';
import {
  isAdminAuthTokenPayload,
  type AdminAuthTokenPayload,
} from './admin-auth.types';

export const INVALID_ADMIN_CREDENTIALS_MESSAGE =
  'Identifiants admin invalides ou compte temporairement verrouillé';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async login(input: AdminLoginDto, meta: ClientMeta) {
    const email = input.email.trim().toLowerCase();
    const now = new Date();
    const admin = await this.prisma.adminUser.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    const check = await checkCredentials(admin, input.password, now);

    if (!admin || check.outcome !== 'ok') {
      if (admin) {
        if (check.outcome !== 'ok' && check.nextState) {
          await this.prisma.adminUser.update({
            where: { id: admin.id },
            data: check.nextState,
          });
        }

        await this.audit.record({
          actor: { type: 'ADMIN', id: admin.id, ip: meta.ip },
          action:
            check.outcome === 'locked'
              ? 'AUTH_ACCOUNT_LOCKED'
              : 'AUTH_LOGIN_FAILED',
          entityType: 'AdminUser',
          entityId: admin.id,
        });
      }

      throw new UnauthorizedException(INVALID_ADMIN_CREDENTIALS_MESSAGE);
    }

    const updatedAdmin = await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: now, failedLoginAttempts: 0, lockedUntil: null },
    });
    const session = await this.sessions.create(
      { type: 'ADMIN', id: admin.id },
      meta,
    );
    const payload: AdminAuthTokenPayload = {
      sub: updatedAdmin.id,
      sid: session.id,
      adminId: updatedAdmin.id,
      email: updatedAdmin.email,
      role: updatedAdmin.role,
    };

    await this.audit.record({
      actor: { type: 'ADMIN', id: admin.id, ip: meta.ip },
      action: 'AUTH_LOGIN_SUCCEEDED',
      entityType: 'AdminUser',
      entityId: admin.id,
    });

    return {
      success: true,
      token: await this.jwtService.signAsync(payload, {
        expiresIn: ADMIN_JWT_EXPIRES_IN,
      }),
      admin: this.mapAdmin(updatedAdmin),
    };
  }

  /** Révoque la session portée par le jeton, même expiré. Idempotent. */
  async logout(token: unknown, meta: ClientMeta) {
    if (typeof token === 'string' && token !== '') {
      try {
        const payload = await this.jwtService.verifyAsync<
          Record<string, unknown>
        >(token, { secret: ADMIN_JWT_SECRET, ignoreExpiration: true });

        if (isAdminAuthTokenPayload(payload)) {
          await this.sessions.revoke(payload.sid);
          await this.audit.record({
            actor: { type: 'ADMIN', id: payload.adminId, ip: meta.ip },
            action: 'AUTH_LOGOUT',
            entityType: 'AdminUser',
            entityId: payload.adminId,
          });
        }
      } catch {
        // Jeton illisible : rien à révoquer.
      }
    }

    return { success: true };
  }

  async getCurrentAdmin(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: {
        id: adminId,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Session admin invalide ou expirée');
    }

    return this.mapAdmin(admin);
  }

  private mapAdmin(
    admin: Pick<AdminUser, 'id' | 'email' | 'name' | 'role' | 'lastLoginAt'>,
  ) {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    };
  }
}
