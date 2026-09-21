import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { mapStudentProfile } from '../student-portal/student-portal.mapper';
import { JWT_EXPIRES_IN, JWT_SECRET } from './auth.constants';
import type { LoginDto } from './auth.dto';
import { isAuthTokenPayload, type AuthTokenPayload } from './auth.types';
import { checkCredentials } from './session/credentials';
import { SessionService, type ClientMeta } from './session/session.service';

export const INVALID_CREDENTIALS_MESSAGE =
  'Identifiants invalides ou compte temporairement verrouillé';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async login(input: LoginDto, meta: ClientMeta) {
    const identifier = input.identifier.trim();
    const now = new Date();
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { studentNumber: identifier },
        ],
      },
    });
    const check = await checkCredentials(student, input.password, now);

    if (!student || check.outcome !== 'ok') {
      if (student) {
        if (check.outcome !== 'ok' && check.nextState) {
          await this.prisma.student.update({
            where: { id: student.id },
            data: check.nextState,
          });
        }

        await this.audit.record({
          actor: { type: 'STUDENT', id: student.id, ip: meta.ip },
          action:
            check.outcome === 'locked'
              ? 'AUTH_ACCOUNT_LOCKED'
              : 'AUTH_LOGIN_FAILED',
          entityType: 'Student',
          entityId: student.id,
        });
      }

      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const updatedStudent = await this.prisma.student.update({
      where: { id: student.id },
      data: { lastLoginAt: now, failedLoginAttempts: 0, lockedUntil: null },
    });
    const session = await this.sessions.create(
      { type: 'STUDENT', id: student.id },
      meta,
    );
    const payload: AuthTokenPayload = {
      sub: updatedStudent.id,
      sid: session.id,
      studentId: updatedStudent.id,
      codeEtudiant: updatedStudent.studentNumber,
    };

    await this.audit.record({
      actor: { type: 'STUDENT', id: student.id, ip: meta.ip },
      action: 'AUTH_LOGIN_SUCCEEDED',
      entityType: 'Student',
      entityId: student.id,
    });

    return {
      success: true,
      token: await this.jwtService.signAsync(payload, {
        expiresIn: JWT_EXPIRES_IN,
      }),
      student: mapStudentProfile(updatedStudent),
    };
  }

  /** Révoque la session portée par le jeton, même expiré. Idempotent. */
  async logout(token: unknown, meta: ClientMeta) {
    if (typeof token === 'string' && token !== '') {
      try {
        const payload = await this.jwtService.verifyAsync<
          Record<string, unknown>
        >(token, { secret: JWT_SECRET, ignoreExpiration: true });

        if (isAuthTokenPayload(payload)) {
          await this.sessions.revoke(payload.sid);
          await this.audit.record({
            actor: { type: 'STUDENT', id: payload.studentId, ip: meta.ip },
            action: 'AUTH_LOGOUT',
            entityType: 'Student',
            entityId: payload.studentId,
          });
        }
      } catch {
        // Jeton illisible : rien à révoquer.
      }
    }

    return { success: true };
  }

  async getCurrentStudent(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: {
        id: studentId,
      },
    });

    if (!student) {
      throw new UnauthorizedException('Session invalide ou expirée');
    }

    return mapStudentProfile(student);
  }
}
