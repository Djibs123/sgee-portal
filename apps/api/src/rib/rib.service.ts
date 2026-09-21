import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Rib } from '@prisma/client';
import { AuditService, type AuditActor } from '../audit/audit.service';
import { fieldCipher } from '../common/crypto/field-cipher';
import { normalizeIban, protectIban } from '../common/crypto/iban';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitRibDto } from './rib.dto';
import { mapAdminRib, mapStudentRib } from './rib.mapper';

const studentMinimalSelect = {
  id: true,
  studentNumber: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.StudentSelect;

export type RibDecision = 'VALIDATED' | 'REJECTED';

/** IBAN en clair : colonne chiffrée, ou ancienne colonne tant que la reprise n'est pas faite. */
function ibanOf(rib: Rib) {
  if (rib.ibanCiphertext) {
    return fieldCipher.decrypt(rib.ibanCiphertext);
  }

  return rib.iban ? normalizeIban(rib.iban) : null;
}

function fingerprintOf(rib: Rib) {
  if (rib.ibanFingerprint) {
    return rib.ibanFingerprint;
  }

  return rib.iban ? fieldCipher.fingerprint(normalizeIban(rib.iban)) : null;
}

/**
 * Cycle de vie du RIB. Le RIB actif (validé) reste celui utilisé pour les versements
 * tant qu'une nouvelle demande n'a pas été validée par un instructeur : un compte
 * compromis ne peut donc pas détourner les paiements sans contrôle humain.
 */
@Injectable()
export class RibService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getForStudent(studentId: string) {
    const [active, pending, latest] = await Promise.all([
      this.prisma.rib.findFirst({ where: { studentId, activeSlot: true } }),
      this.prisma.rib.findFirst({ where: { studentId, pendingSlot: true } }),
      this.prisma.rib.findFirst({
        where: { studentId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      active: active ? mapStudentRib(active) : null,
      pending: pending ? mapStudentRib(pending) : null,
      lastRejected:
        latest?.status === 'REJECTED' ? mapStudentRib(latest) : null,
    };
  }

  async submit(studentId: string, data: SubmitRibDto, actor: AuditActor) {
    const protectedIban = protectIban(data.iban);

    await this.prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: studentId },
        select: { firstName: true, lastName: true, email: true },
      });

      if (!student) {
        throw new NotFoundException('Étudiant introuvable');
      }

      const [active, pending] = await Promise.all([
        tx.rib.findFirst({ where: { studentId, activeSlot: true } }),
        tx.rib.findFirst({ where: { studentId, pendingSlot: true } }),
      ]);

      if (active && fingerprintOf(active) === protectedIban.ibanFingerprint) {
        throw new ConflictException('Cet IBAN est déjà votre RIB actif');
      }

      const ribData = {
        bankName: data.banque,
        // Le RIB doit être au nom du bénéficiaire de la bourse.
        holderName: `${student.firstName} ${student.lastName}`,
        ...protectedIban,
        iban: null,
        bic: data.bic ?? '',
        address: data.adresse ?? active?.address ?? '',
        phone: data.telephone ?? active?.phone ?? '',
        email: data.email ?? active?.email ?? student.email,
        status: 'PENDING' as const,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewComment: null,
      };
      const rib = pending
        ? await tx.rib.update({ where: { id: pending.id }, data: ribData })
        : await tx.rib.create({
            data: { ...ribData, studentId, pendingSlot: true },
          });

      await this.audit.record(
        {
          actor,
          action: 'RIB_SUBMITTED',
          entityType: 'Rib',
          entityId: rib.id,
          metadata: {
            studentId,
            ibanLast4: protectedIban.ibanLast4,
            replacedPendingSubmission: Boolean(pending),
          },
        },
        tx,
      );
    });

    return this.getForStudent(studentId);
  }

  async cancelPending(studentId: string, actor: AuditActor) {
    const pending = await this.prisma.rib.findFirst({
      where: { studentId, pendingSlot: true },
    });

    if (!pending) {
      throw new NotFoundException('Aucun RIB en attente');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rib.delete({ where: { id: pending.id } });
      await this.audit.record(
        {
          actor,
          action: 'RIB_SUBMISSION_CANCELLED',
          entityType: 'Rib',
          entityId: pending.id,
          metadata: { studentId },
        },
        tx,
      );
    });

    return this.getForStudent(studentId);
  }

  async listPending(page: number, pageSize: number) {
    const where: Prisma.RibWhereInput = { pendingSlot: true };
    const [total, ribs] = await this.prisma.$transaction([
      this.prisma.rib.count({ where }),
      this.prisma.rib.findMany({
        where,
        include: { student: { select: studentMinimalSelect } },
        orderBy: { submittedAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Deux requêtes groupées au lieu de deux par ligne.
    const studentIds = ribs.map((rib) => rib.studentId);
    const fingerprints = ribs
      .map(fingerprintOf)
      .filter((value): value is string => value !== null);
    const [activeRibs, sameIbanRibs] = await Promise.all([
      this.prisma.rib.findMany({
        where: { studentId: { in: studentIds }, activeSlot: true },
      }),
      this.prisma.rib.findMany({
        where: {
          ibanFingerprint: { in: fingerprints },
          OR: [{ activeSlot: true }, { pendingSlot: true }],
        },
        select: { studentId: true, ibanFingerprint: true },
      }),
    ]);
    const activeByStudent = new Map(
      activeRibs.map((rib) => [rib.studentId, rib]),
    );

    return {
      items: ribs.map((rib) => {
        const fingerprint = fingerprintOf(rib);
        const otherStudents = new Set(
          sameIbanRibs
            .filter(
              (other) =>
                other.ibanFingerprint === fingerprint &&
                other.studentId !== rib.studentId,
            )
            .map((other) => other.studentId),
        );

        return mapAdminRib(rib, {
          activeRib: activeByStudent.get(rib.studentId) ?? null,
          sharedIbanCount: otherStudents.size,
        });
      }),
      page,
      pageSize,
      total,
    };
  }

  async review(
    ribId: string,
    decision: RibDecision,
    reviewComment: string | undefined,
    actor: AuditActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rib = await tx.rib.findUnique({ where: { id: ribId } });

      if (!rib) {
        throw new NotFoundException('RIB introuvable');
      }

      if (rib.status !== 'PENDING' || rib.pendingSlot !== true) {
        throw new ConflictException('Ce RIB ne peut pas être instruit');
      }

      const now = new Date();
      const previousActive = await tx.rib.findFirst({
        where: { studentId: rib.studentId, activeSlot: true },
      });

      if (decision === 'VALIDATED' && previousActive) {
        // Libérer le slot actif avant de l'attribuer (contrainte d'unicité).
        await tx.rib.update({
          where: { id: previousActive.id },
          data: { activeSlot: null, supersededAt: now },
        });
      }

      const updated = await tx.rib.update({
        where: { id: rib.id },
        data: {
          status: decision,
          pendingSlot: null,
          activeSlot: decision === 'VALIDATED' ? true : null,
          reviewedAt: now,
          reviewComment: reviewComment ?? null,
        },
        include: { student: { select: studentMinimalSelect } },
      });

      await this.audit.record(
        {
          actor,
          action: decision === 'VALIDATED' ? 'RIB_VALIDATED' : 'RIB_REJECTED',
          entityType: 'Rib',
          entityId: rib.id,
          metadata: {
            studentId: rib.studentId,
            ibanLast4: rib.ibanLast4,
            supersededRibId:
              decision === 'VALIDATED' ? (previousActive?.id ?? null) : null,
            reviewComment: reviewComment ?? null,
          },
        },
        tx,
      );

      return mapAdminRib(updated, {
        activeRib: decision === 'VALIDATED' ? updated : previousActive,
        sharedIbanCount: 0,
      });
    });
  }

  /** IBAN complet pour l'instruction : chaque consultation est journalisée. */
  async revealIban(ribId: string, actor: AuditActor) {
    const rib = await this.prisma.rib.findUnique({ where: { id: ribId } });
    const iban = rib ? ibanOf(rib) : null;

    if (!rib || !iban) {
      throw new NotFoundException('RIB introuvable');
    }

    await this.audit.record({
      actor,
      action: 'RIB_IBAN_REVEALED',
      entityType: 'Rib',
      entityId: rib.id,
      metadata: { studentId: rib.studentId },
    });

    return { iban };
  }
}
