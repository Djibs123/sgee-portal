import { Injectable } from '@nestjs/common';
import type { AuditActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Actions journalisées. Ajouter ici toute nouvelle action sensible. */
export type AuditAction =
  | 'AUTH_LOGIN_SUCCEEDED'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_LOGOUT'
  | 'DOCUMENT_VALIDATED'
  | 'DOCUMENT_REJECTED'
  | 'RIB_VALIDATED'
  | 'RIB_REJECTED';

export type AuditActor = {
  type: AuditActorType;
  id: string | null;
  ip?: string | null;
};

export type AuditEntry = {
  actor: AuditActor;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type AuditWriter = Pick<Prisma.TransactionClient, 'auditLog'>;

export type ListAuditLogsFilter = {
  page: number;
  pageSize: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Passer le client de transaction pour journaliser dans la même transaction que l'action. */
  record(entry: AuditEntry, client: AuditWriter = this.prisma) {
    return client.auditLog.create({
      data: {
        actorType: entry.actor.type,
        actorId: entry.actor.id,
        ip: entry.actor.ip?.slice(0, 64) ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
      },
    });
  }

  async list({ page, pageSize, ...filter }: ListAuditLogsFilter) {
    const where: Prisma.AuditLogWhereInput = {
      action: filter.action,
      entityType: filter.entityType,
      entityId: filter.entityId,
      actorId: filter.actorId,
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }
}
