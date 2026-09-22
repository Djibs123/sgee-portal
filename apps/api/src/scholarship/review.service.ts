import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditService,
  type AuditActor,
  type AuditAction,
} from '../audit/audit.service';
import { UploadedFilesService } from '../common/uploads/uploaded-files.service';
import type {
  Applicant,
  Prisma,
  RequestStatus,
  Student,
} from '../generated/prisma/client';
import { MailerService } from '../mail/mailer.service';
import {
  NotificationsService,
  type NotificationInput,
} from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ageOn, type EligibilityResult } from './domain/eligibility';
import {
  assertTransition,
  InvalidTransitionError,
} from './domain/request-status';
import { levelLabel } from './domain/study-levels';
import type { ListRequestsQueryDto, RequestInfoDto } from './dto/review.dto';
import { requestInclude, type RequestOwner } from './requests.service';
import { mapRequest, mapRequestSummary } from './scholarship.mapper';

const reviewInclude = {
  ...requestInclude,
  student: { include: { cursus: { orderBy: { academicYear: 'asc' } } } },
  applicant: true,
} satisfies Prisma.ScholarshipRequestInclude;

type ReviewedRequest = Prisma.ScholarshipRequestGetPayload<{
  include: typeof reviewInclude;
}>;

type Decision = {
  to: RequestStatus;
  action: AuditAction;
  comment?: string;
  notification: (request: ReviewedRequest) => NotificationInput;
  /** Effets métier exécutés dans la même transaction que le changement de statut. */
  apply?: (
    tx: Prisma.TransactionClient,
    request: ReviewedRequest,
  ) => Promise<void>;
  /** Informer aussi par e-mail (décisions et demandes de complément). */
  email?: boolean;
};

const FINAL_STATUSES: RequestStatus[] = ['APPROVED', 'REJECTED'];

function ownerOf(request: ReviewedRequest): RequestOwner {
  return request.studentId
    ? { kind: 'STUDENT', id: request.studentId }
    : { kind: 'APPLICANT', id: request.applicantId! };
}

function ownerSummary(request: {
  student: Pick<
    Student,
    'studentNumber' | 'firstName' | 'lastName' | 'email'
  > | null;
  applicant: Pick<Applicant, 'firstName' | 'lastName' | 'email'> | null;
}) {
  const person = request.student ?? request.applicant;

  return {
    kind: request.student ? ('STUDENT' as const) : ('APPLICANT' as const),
    name: person ? `${person.firstName} ${person.lastName}` : '',
    email: person?.email ?? '',
    studentNumber: request.student?.studentNumber ?? null,
  };
}

/** Instruction des demandes par les agents du SGEE. */
@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: UploadedFilesService,
    private readonly notifications: NotificationsService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
  ) {}

  async list({
    page,
    pageSize,
    search,
    hasWarnings,
    ...filters
  }: ListRequestsQueryDto) {
    const where: Prisma.ScholarshipRequestWhereInput = {
      status: filters.status ?? { not: 'DRAFT' },
      type: filters.type,
      campaignId: filters.campaignId,
      targetLevel: filters.targetLevel,
      ...(hasWarnings === undefined
        ? {}
        : { warningCount: hasWarnings ? { gt: 0 } : 0 }),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              {
                student: {
                  studentNumber: { contains: search, mode: 'insensitive' },
                },
              },
              {
                student: {
                  lastName: { contains: search, mode: 'insensitive' },
                },
              },
              { student: { email: { contains: search, mode: 'insensitive' } } },
              {
                applicant: {
                  lastName: { contains: search, mode: 'insensitive' },
                },
              },
              {
                applicant: { email: { contains: search, mode: 'insensitive' } },
              },
            ],
          }
        : {}),
    };
    const [total, requests] = await this.prisma.$transaction([
      this.prisma.scholarshipRequest.count({ where }),
      this.prisma.scholarshipRequest.findMany({
        where,
        include: {
          campaign: { select: { title: true } },
          student: {
            select: {
              studentNumber: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          applicant: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        // File d'attente : les plus anciennes soumissions d'abord.
        orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: requests.map((request) => ({
        ...mapRequestSummary(request),
        warningCount: request.warningCount,
        owner: ownerSummary(request),
      })),
      page,
      pageSize,
      total,
    };
  }

  async detail(requestId: string) {
    const request = await this.load(requestId);
    const eligibility: EligibilityResult = {
      eligible: true,
      blockers: [],
      warnings:
        (request.eligibilityWarnings as EligibilityResult['warnings'] | null) ??
        [],
    };

    return {
      ...mapRequest(request, eligibility),
      warningCount: request.warningCount,
      owner: {
        ...ownerSummary(request),
        birthDate:
          (request.student ?? request.applicant)?.birthDate
            .toISOString()
            .slice(0, 10) ?? null,
        age: (() => {
          const birthDate = (request.student ?? request.applicant)?.birthDate;

          return birthDate ? ageOn(birthDate, new Date()) : null;
        })(),
        scholarshipStatus: request.student?.scholarshipStatus ?? null,
        currentLevel: request.student?.levelCode ?? null,
        cursus:
          request.student?.cursus.map((entry) => ({
            academicYear: entry.academicYear,
            institution: entry.institution,
            level: entry.levelCode ? levelLabel(entry.levelCode) : entry.level,
            result: entry.result,
            isCurrent: entry.isCurrent,
          })) ?? [],
      },
    };
  }

  async downloadDocument(requestId: string, documentId: string) {
    const request = await this.load(requestId);
    const document = request.documents.find((item) => item.id === documentId);

    if (!document) {
      throw new NotFoundException('Pièce introuvable');
    }

    return this.files.resolveDownload(document);
  }

  startReview(requestId: string, actor: AuditActor, comment?: string) {
    return this.decide(requestId, actor, {
      to: 'UNDER_REVIEW',
      action: 'REQUEST_REVIEW_STARTED',
      comment,
      notification: (request) => ({
        type: 'REQUEST_UNDER_REVIEW',
        title: `Demande ${request.reference} en cours d’instruction`,
        body: 'Un agent du SGEE examine votre dossier.',
      }),
    });
  }

  requestInfo(requestId: string, data: RequestInfoDto, actor: AuditActor) {
    return this.decide(requestId, actor, {
      to: 'INCOMPLETE',
      action: 'REQUEST_INFO_REQUESTED',
      comment: data.comment,
      email: true,
      apply: async (tx, request) => {
        for (const document of data.documents ?? []) {
          const requirement = request.campaign.requirements.find(
            (item) => item.documentTypeCode === document.documentTypeCode,
          );

          if (!requirement) {
            throw new BadRequestException(
              `Pièce inconnue pour cette campagne : ${document.documentTypeCode}`,
            );
          }

          await tx.requestDocument.upsert({
            where: {
              requestId_documentTypeCode: {
                requestId: request.id,
                documentTypeCode: document.documentTypeCode,
              },
            },
            update: {
              status: 'REJECTED',
              reviewComment: document.comment,
              reviewedAt: new Date(),
            },
            create: {
              requestId: request.id,
              documentTypeCode: document.documentTypeCode,
              required: requirement.isRequired,
              status: 'REJECTED',
              reviewComment: document.comment,
              reviewedAt: new Date(),
            },
          });
        }
      },
      notification: (request) => ({
        type: 'REQUEST_INFO_REQUESTED',
        title: `Complément demandé pour ${request.reference}`,
        body: data.comment,
      }),
    });
  }

  approve(requestId: string, actor: AuditActor, comment?: string) {
    return this.decide(requestId, actor, {
      to: 'APPROVED',
      action: 'REQUEST_APPROVED',
      comment,
      email: true,
      apply: async (tx, request) => {
        await tx.requestDocument.updateMany({
          where: { requestId: request.id, status: 'PENDING' },
          data: { status: 'VALIDATED', reviewedAt: new Date() },
        });

        if (request.type === 'RENEWAL') {
          await this.applyRenewal(tx, request);
        } else {
          await this.createScholar(tx, request);
        }
      },
      notification: (request) =>
        request.type === 'RENEWAL'
          ? {
              type: 'REQUEST_APPROVED',
              title: `Renouvellement ${request.campaign.academicYear.label} accepté`,
              body: 'Votre bourse est renouvelée pour la nouvelle année universitaire.',
            }
          : {
              type: 'REQUEST_APPROVED',
              title: 'Bourse attribuée',
              body: 'Votre compte boursier est ouvert : connectez-vous au portail boursier avec votre adresse e-mail et votre mot de passe.',
            },
    });
  }

  reject(requestId: string, actor: AuditActor, comment: string) {
    return this.decide(requestId, actor, {
      to: 'REJECTED',
      action: 'REQUEST_REJECTED',
      comment,
      email: true,
      apply: async (tx, request) => {
        // Renouvellement refusé : la bourse n'est pas reconduite (un recours reste possible).
        if (request.type === 'RENEWAL' && request.studentId) {
          await tx.student.update({
            where: { id: request.studentId },
            data: {
              scholarshipStatus: 'CANCELLED',
              lastProcessingDate: new Date(),
            },
          });
        }
      },
      notification: (request) => ({
        type: 'REQUEST_REJECTED',
        title: `Demande ${request.reference} refusée`,
        body: comment,
      }),
    });
  }

  private async decide(
    requestId: string,
    actor: AuditActor,
    decision: Decision,
  ) {
    const request = await this.load(requestId);

    try {
      assertTransition(request.status, decision.to, 'ADMIN');
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }

    const now = new Date();
    const owner = ownerOf(request);
    const isFinal = FINAL_STATUSES.includes(decision.to);
    const notification = decision.notification(request);

    await this.prisma.$transaction(async (tx) => {
      // Condition sur le statut lu : deux agents ne peuvent pas décider en même temps.
      const { count } = await tx.scholarshipRequest.updateMany({
        where: { id: request.id, status: request.status },
        data: {
          status: decision.to,
          version: { increment: 1 },
          ...(isFinal && {
            decidedAt: now,
            decidedById: actor.id,
            decisionComment: decision.comment ?? null,
          }),
        },
      });

      if (count === 0) {
        throw new ConflictException(
          'La demande vient d’être traitée par un autre agent',
        );
      }

      await tx.requestStatusHistory.create({
        data: {
          requestId: request.id,
          fromStatus: request.status,
          toStatus: decision.to,
          actorType: 'ADMIN',
          actorId: actor.id,
          comment: decision.comment ?? null,
        },
      });
      await decision.apply?.(tx, request);
      await this.notifications.notify(
        owner.kind === 'STUDENT'
          ? { studentId: owner.id }
          : { applicantId: owner.id },
        {
          ...notification,
          link:
            owner.kind === 'STUDENT'
              ? `/portal/renouvellement?demande=${request.id}`
              : `/candidature?demande=${request.id}`,
        },
        tx,
      );
      await this.audit.record(
        {
          actor,
          action: decision.action,
          entityType: 'ScholarshipRequest',
          entityId: request.id,
          metadata: {
            reference: request.reference,
            from: request.status,
            to: decision.to,
            comment: decision.comment ?? null,
          },
        },
        tx,
      );
    });

    if (decision.email) {
      this.sendDecisionEmail(request, notification);
    }

    return this.detail(requestId);
  }

  /** Renouvellement accepté : nouvelle année courante dans le cursus et le dossier. */
  private async applyRenewal(
    tx: Prisma.TransactionClient,
    request: ReviewedRequest,
  ) {
    const studentId = request.studentId!;
    const targetLevel = request.targetLevel!;
    const year = request.campaign.academicYear;
    const previousStatus =
      request.previousResult === 'PASSED'
        ? 'VALIDATED'
        : (request.previousResult ?? 'COMPLETED');

    await tx.cursusEntry.updateMany({
      where: { studentId, isCurrent: true },
      data: {
        isCurrent: false,
        result: request.previousResult,
        status: previousStatus,
      },
    });
    await tx.cursusEntry.create({
      data: {
        studentId,
        academicYear: year.label,
        institution: request.institution!,
        level: levelLabel(targetLevel),
        levelCode: targetLevel,
        specialty: request.fieldOfStudy!,
        diploma: levelLabel(targetLevel),
        status: 'CURRENT',
        isCurrent: true,
      },
    });
    await tx.student.update({
      where: { id: studentId },
      data: {
        academicYear: year.label,
        levelCode: targetLevel,
        level: levelLabel(targetLevel),
        field: request.fieldOfStudy,
        academy: request.city ?? undefined,
        country: request.country ?? undefined,
        scholarshipStatus: 'ACTIVE',
        lastProcessingDate: new Date(),
      },
    });
  }

  /** Candidature acceptée : création du dossier boursier, connexion avec les mêmes identifiants. */
  private async createScholar(
    tx: Prisma.TransactionClient,
    request: ReviewedRequest,
  ) {
    const applicant = request.applicant!;
    const targetLevel = request.targetLevel!;
    const year = request.campaign.academicYear;

    if (applicant.studentId) {
      throw new ConflictException('Ce candidat est déjà boursier');
    }

    const emailTaken = await tx.student.count({
      where: { email: { equals: applicant.email, mode: 'insensitive' } },
    });

    if (emailTaken > 0) {
      throw new ConflictException(
        'Un boursier utilise déjà cette adresse e-mail',
      );
    }

    const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`
      SELECT nextval('student_number_seq') AS n`;
    const student = await tx.student.create({
      data: {
        studentNumber: `SGEE${year.code.slice(0, 4)}-${String(n).padStart(5, '0')}`,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        email: applicant.email,
        birthDate: applicant.birthDate,
        passwordHash: applicant.passwordHash,
        scholarshipStatus: 'ACTIVE',
        levelCode: targetLevel,
        level: levelLabel(targetLevel),
        field: request.fieldOfStudy,
        academy: request.city,
        country: request.country,
        academicYear: year.label,
        startDate: year.startsOn,
        lastProcessingDate: new Date(),
        birthCountry: 'Sénégal',
        cursus: {
          create: {
            academicYear: year.label,
            institution: request.institution!,
            level: levelLabel(targetLevel),
            levelCode: targetLevel,
            specialty: request.fieldOfStudy!,
            diploma: levelLabel(targetLevel),
            status: 'CURRENT',
            isCurrent: true,
          },
        },
        // Pièces attendues après attribution (règlement SGEE).
        documents: {
          create: [
            {
              name: 'Relevé d’identité bancaire',
              type: 'RIB',
              status: 'REQUIRED',
              required: true,
            },
            {
              name: 'Attestation d’arrivée',
              type: 'ATTESTATION_ARRIVEE',
              status: 'REQUIRED',
              required: true,
            },
          ],
        },
      },
    });

    await tx.applicant.update({
      where: { id: applicant.id },
      data: { studentId: student.id },
    });
    await this.notifications.notify(
      { studentId: student.id },
      {
        type: 'REQUEST_APPROVED',
        title: 'Bienvenue sur le portail boursier',
        body: 'Déposez votre RIB et votre attestation d’arrivée pour permettre les versements.',
        link: '/portal/documents',
      },
      tx,
    );
  }

  private async load(requestId: string): Promise<ReviewedRequest> {
    const request = await this.prisma.scholarshipRequest.findUnique({
      where: { id: requestId },
      include: reviewInclude,
    });

    if (!request || request.status === 'DRAFT') {
      throw new NotFoundException('Demande introuvable');
    }

    return request;
  }

  private sendDecisionEmail(
    request: ReviewedRequest,
    notification: NotificationInput,
  ) {
    const person = request.student ?? request.applicant;

    if (!person) {
      return;
    }

    const link = this.mailer.link(
      request.studentId ? '/portal/renouvellement' : '/candidature',
      { demande: request.id },
    );

    void this.mailer
      .send({
        to: person.email,
        subject: `${notification.title} – Portail SGEE`,
        text: [
          `Bonjour ${person.firstName},`,
          '',
          notification.body,
          '',
          `Suivre votre dossier : ${link}`,
          '',
          'Service de Gestion des Étudiants sénégalais à l’Étranger',
        ].join('\n'),
      })
      .catch((error: unknown) =>
        this.logger.error(`E-mail de décision non envoyé : ${String(error)}`),
      );
  }
}
