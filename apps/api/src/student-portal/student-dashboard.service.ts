import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { levelLabel } from '../scholarship/domain/study-levels';
import { RequestsService } from '../scholarship/requests.service';
import { scholarshipStatusLabels } from './student-portal.mapper';

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

/** Premier jour du mois suivant (UTC) : estimation du prochain versement mensuel. */
function firstDayOfNextMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export function scholarshipProgress(
  startDate: Date | null,
  endDate: Date | null,
  now: Date,
) {
  if (!startDate || !endDate || endDate <= startDate) {
    return null;
  }

  const ratio =
    (now.getTime() - startDate.getTime()) /
    (endDate.getTime() - startDate.getTime());

  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

/** Synthèse du tableau de bord : aucune valeur n'est codée en dur côté front. */
@Injectable()
export class StudentDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly notifications: NotificationsService,
  ) {}

  async getDashboard(studentId: string, now = new Date()) {
    const [
      student,
      payments,
      documentsToProvide,
      ribs,
      renewal,
      notifications,
    ] = await Promise.all([
      this.prisma.student.findUniqueOrThrow({ where: { id: studentId } }),
      this.prisma.payment.findMany({
        where: { studentId, status: 'PAID' },
        orderBy: { paymentDate: 'desc' },
      }),
      this.prisma.studentDocument.findMany({
        where: { studentId, status: { in: ['REQUIRED', 'REJECTED'] } },
        select: { id: true, name: true, status: true, reviewComment: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.rib.findMany({
        where: {
          studentId,
          OR: [{ activeSlot: true }, { pendingSlot: true }],
        },
        select: {
          activeSlot: true,
          pendingSlot: true,
          bankName: true,
          ibanMasked: true,
        },
      }),
      this.requests.currentCampaign({ kind: 'STUDENT', id: studentId }, now),
      this.notifications.list({ studentId }, { page: 1, pageSize: 3 }),
    ]);

    const currency =
      student.allocationCurrency ?? payments[0]?.currency ?? 'EUR';
    const currentYearPayments = payments.filter(
      (payment) => payment.academicYear === student.academicYear,
    );
    const totalCurrentYear = currentYearPayments.reduce(
      (sum, payment) => sum + Math.round(payment.amount.toNumber() * 100),
      0,
    );
    const lastPayment = payments[0] ?? null;
    let nextEstimatedAt: Date | null =
      student.scholarshipStatus === 'ACTIVE' && lastPayment
        ? firstDayOfNextMonth(lastPayment.paymentDate)
        : null;

    if (
      nextEstimatedAt &&
      student.endDate &&
      nextEstimatedAt > student.endDate
    ) {
      nextEstimatedAt = null;
    }

    const activeRib = ribs.find((rib) => rib.activeSlot) ?? null;

    return {
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        studentNumber: student.studentNumber,
        matricule: student.matricule,
        level: student.levelCode
          ? levelLabel(student.levelCode)
          : student.level,
        levelCode: student.levelCode,
        field: student.field,
        academy: student.academy,
        country: student.country,
        academicYear: student.academicYear,
      },
      scholarship: {
        status: student.scholarshipStatus,
        statusLabel: scholarshipStatusLabels[student.scholarshipStatus],
        type: student.scholarshipType,
        paymentMethod: student.paymentMethod,
        startDate: iso(student.startDate),
        endDate: iso(student.endDate),
        progressPercent:
          scholarshipProgress(student.startDate, student.endDate, now) ??
          student.progressPercent,
        monthlyAllocation: student.allocationMonthlyAmount?.toFixed(2) ?? null,
        monthlyAllocationCfa: student.allocationCfaAmount,
        currency,
        attributionNumber: student.attributionNumber,
      },
      payments: {
        currentYearCount: currentYearPayments.length,
        currentYearTotal: (totalCurrentYear / 100).toFixed(2),
        currency,
        last: lastPayment
          ? {
              month: lastPayment.month,
              academicYear: lastPayment.academicYear,
              amount: lastPayment.amount.toFixed(2),
              currency: lastPayment.currency,
              paidAt: lastPayment.paymentDate.toISOString(),
            }
          : null,
        /** Estimation : premier jour du mois suivant le dernier versement. */
        nextEstimatedAt: iso(nextEstimatedAt),
      },
      documents: {
        toProvide: documentsToProvide.map((document) => ({
          id: document.id,
          name: document.name,
          status: document.status,
          reviewComment: document.reviewComment,
        })),
      },
      rib: {
        active: activeRib
          ? { bankName: activeRib.bankName, ibanMasked: activeRib.ibanMasked }
          : null,
        hasPendingChange: ribs.some((rib) => rib.pendingSlot),
      },
      renewal,
      notifications: {
        unreadCount: notifications.unreadCount,
        latest: notifications.items,
      },
    };
  }
}
