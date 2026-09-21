import { Injectable } from '@nestjs/common';
import type { AdminRole, SessionSubject } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Durée de vie absolue d'une session (alignée sur l'expiration du JWT). */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** Déconnexion après inactivité (OWASP Session Management). */
export const SESSION_IDLE_TIMEOUT_MS: Record<SessionSubject, number> = {
  STUDENT: 60 * 60 * 1000,
  APPLICANT: 60 * 60 * 1000,
  ADMIN: 30 * 60 * 1000,
};

/** Évite une écriture en base à chaque requête. */
const TOUCH_INTERVAL_MS = 60 * 1000;

export type SessionSubjectRef =
  { type: 'STUDENT'; id: string } | { type: 'ADMIN'; id: string };

export type ClientMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

export type ValidSession = {
  id: string;
  subjectType: SessionSubject;
  adminRole: AdminRole | null;
};

function subjectColumns(subject: SessionSubjectRef) {
  return subject.type === 'STUDENT'
    ? { studentId: subject.id }
    : { adminUserId: subject.id };
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(subject: SessionSubjectRef, meta: ClientMeta) {
    const now = new Date();
    const columns = subjectColumns(subject);

    // Purge au fil de l'eau des sessions mortes de ce compte.
    await this.prisma.session.deleteMany({
      where: {
        ...columns,
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
      },
    });

    return this.prisma.session.create({
      data: {
        ...columns,
        subjectType: subject.type,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        ip: meta.ip?.slice(0, 64) ?? null,
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
      },
    });
  }

  /** Renvoie la session si elle est active, sinon `null` (révoquée, expirée ou inactive). */
  async validate(
    sessionId: string,
    expectedType: SessionSubject,
    subjectId: string,
  ): Promise<ValidSession | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { adminUser: { select: { role: true } } },
    });
    const now = Date.now();

    if (
      !session ||
      session.subjectType !== expectedType ||
      (session.studentId ?? session.adminUserId) !== subjectId ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now
    ) {
      return null;
    }

    const idleFor = now - session.lastSeenAt.getTime();

    if (idleFor > SESSION_IDLE_TIMEOUT_MS[expectedType]) {
      await this.revoke(session.id);
      return null;
    }

    if (idleFor > TOUCH_INTERVAL_MS) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now) },
      });
    }

    return {
      id: session.id,
      subjectType: session.subjectType,
      adminRole: session.adminUser?.role ?? null,
    };
  }

  async revoke(sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(subject: SessionSubjectRef) {
    await this.prisma.session.updateMany({
      where: { ...subjectColumns(subject), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
