import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notification, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationRecipient =
  { studentId: string } | { applicantId: string };

export type NotificationType =
  | 'REQUEST_SUBMITTED'
  | 'REQUEST_WITHDRAWN'
  | 'REQUEST_UNDER_REVIEW'
  | 'REQUEST_INFO_REQUESTED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'DOCUMENT_VALIDATED'
  | 'DOCUMENT_REJECTED'
  | 'RIB_VALIDATED'
  | 'RIB_REJECTED';

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
};

type NotificationWriter = Pick<Prisma.TransactionClient, 'notification'>;

export function mapNotification(notification: Notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

/** Notifications in-app ; un envoi e-mail pourra s'y brancher plus tard. */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  notify(
    recipient: NotificationRecipient,
    input: NotificationInput,
    client: NotificationWriter = this.prisma,
  ) {
    return client.notification.create({
      data: { ...recipient, ...input, link: input.link ?? null },
    });
  }

  async list(
    recipient: NotificationRecipient,
    {
      page,
      pageSize,
      unreadOnly,
    }: { page: number; pageSize: number; unreadOnly?: boolean },
  ) {
    const where: Prisma.NotificationWhereInput = {
      ...recipient,
      ...(unreadOnly ? { readAt: null } : {}),
    };
    const [total, unreadCount, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...recipient, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map(mapNotification),
      unreadCount,
      page,
      pageSize,
      total,
    };
  }

  async markRead(recipient: NotificationRecipient, notificationId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { ...recipient, id: notificationId, readAt: null },
      data: { readAt: new Date() },
    });

    if (count === 0) {
      const exists = await this.prisma.notification.count({
        where: { ...recipient, id: notificationId },
      });

      if (!exists) {
        throw new NotFoundException('Notification introuvable');
      }
    }

    return { success: true };
  }

  async markAllRead(recipient: NotificationRecipient) {
    const { count } = await this.prisma.notification.updateMany({
      where: { ...recipient, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: count };
  }
}
