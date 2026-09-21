import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditService, type AuditActor } from '../audit/audit.service';
import { UploadedFilesService } from '../common/uploads/uploaded-files.service';
import type {
  CampaignType,
  Prisma,
  RequestStatus,
  ScholarshipRequest,
} from '../generated/prisma/client';
import {
  NotificationsService,
  type NotificationRecipient,
} from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { campaignInclude, CampaignsService } from './campaigns.service';
import { formatRequestReference, requirementsFor } from './domain/campaign';
import {
  evaluateEligibility,
  type EligibilityResult,
} from './domain/eligibility';
import {
  assertTransition,
  InvalidTransitionError,
  isEditableByOwner,
  REQUEST_STATUS_LABELS,
} from './domain/request-status';
import type { UpdateRequestDto } from './dto/request.dto';
import {
  mapCampaign,
  mapRequest,
  mapRequestSummary,
  type CampaignWithRelations,
} from './scholarship.mapper';

/** Propriétaire d'une demande : boursier (renouvellement) ou candidat (première bourse). */
export type RequestOwner =
  { kind: 'STUDENT'; id: string } | { kind: 'APPLICANT'; id: string };

export const requestInclude = {
  campaign: { include: campaignInclude },
  documents: true,
  history: true,
} satisfies Prisma.ScholarshipRequestInclude;

const EXPECTED_TYPE: Record<RequestOwner['kind'], CampaignType> = {
  STUDENT: 'RENEWAL',
  APPLICANT: 'NEW_APPLICATION',
};

const COMMON_FIELDS = [
  'targetLevel',
  'institution',
  'city',
  'country',
  'fieldOfStudy',
  'programName',
] as const;

const EDITABLE_FIELDS: Record<
  CampaignType,
  readonly (keyof UpdateRequestDto)[]
> = {
  RENEWAL: [
    ...COMMON_FIELDS,
    'previousLevel',
    'previousResult',
    'previousAverage',
    'changedField',
    'changedInstitution',
  ],
  NEW_APPLICATION: [
    ...COMMON_FIELDS,
    'baccalaureateSeries',
    'baccalaureateYear',
    'baccalaureateMention',
    'baccalaureateAverage',
    'motivation',
  ],
};

const REQUIRED_FIELDS: Record<
  CampaignType,
  readonly (keyof ScholarshipRequest)[]
> = {
  RENEWAL: [
    'targetLevel',
    'institution',
    'country',
    'fieldOfStudy',
    'previousLevel',
    'previousResult',
  ],
  NEW_APPLICATION: ['targetLevel', 'institution', 'country', 'fieldOfStudy'],
};

export function ownerColumns(owner: RequestOwner) {
  return owner.kind === 'STUDENT'
    ? { studentId: owner.id }
    : { applicantId: owner.id };
}

export function ownerRecipient(owner: RequestOwner): NotificationRecipient {
  return owner.kind === 'STUDENT'
    ? { studentId: owner.id }
    : { applicantId: owner.id };
}

export function ownerActor(
  owner: RequestOwner,
  ip?: string | null,
): AuditActor {
  return { type: owner.kind, id: owner.id, ip: ip ?? null };
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaigns: CampaignsService,
    private readonly files: UploadedFilesService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** Campagne courante du propriétaire, sa demande éventuelle et son éligibilité. */
  async currentCampaign(owner: RequestOwner, now = new Date()) {
    const campaign = await this.campaigns.findCurrent(
      EXPECTED_TYPE[owner.kind],
    );

    if (!campaign) {
      return { campaign: null, request: null, eligibility: null };
    }

    const request = await this.prisma.scholarshipRequest.findFirst({
      where: { ...ownerColumns(owner), campaignId: campaign.id },
      include: { campaign: { select: { title: true } } },
    });
    const eligibility =
      request && request.status !== 'WITHDRAWN'
        ? null
        : await this.evaluate(owner, null, campaign, now);

    return {
      campaign: mapCampaign(campaign, now),
      request: request ? mapRequestSummary(request) : null,
      eligibility,
    };
  }

  async listForOwner(owner: RequestOwner) {
    const requests = await this.prisma.scholarshipRequest.findMany({
      where: ownerColumns(owner),
      include: { campaign: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { items: requests.map(mapRequestSummary) };
  }

  async getForOwner(owner: RequestOwner, requestId: string, now = new Date()) {
    const request = await this.loadOwned(owner, requestId);
    const eligibility = isEditableByOwner(request.status)
      ? await this.evaluate(owner, request, request.campaign, now)
      : {
          eligible: true,
          blockers: [],
          warnings:
            (request.eligibilityWarnings as
              EligibilityResult['warnings'] | null) ?? [],
        };

    return mapRequest(request, eligibility, now);
  }

  async create(owner: RequestOwner, campaignId: string, ip?: string | null) {
    const campaign = await this.campaigns.getById(campaignId);

    if (campaign.type !== EXPECTED_TYPE[owner.kind]) {
      throw new BadRequestException('Cette campagne ne vous concerne pas');
    }

    const existing = await this.prisma.scholarshipRequest.findFirst({
      where: { ...ownerColumns(owner), campaignId },
    });

    if (existing && existing.status !== 'WITHDRAWN') {
      throw new ConflictException({
        message: 'Une demande existe déjà pour cette campagne',
        requestId: existing.id,
      });
    }

    const eligibility = await this.evaluate(owner, null, campaign, new Date());

    if (!eligibility.eligible) {
      throw new UnprocessableEntityException({
        message: eligibility.blockers[0].message,
        blockers: eligibility.blockers,
      });
    }

    const prefill =
      owner.kind === 'STUDENT' ? await this.renewalPrefill(owner.id) : {};
    const requestId = await this.prisma.$transaction(async (tx) => {
      let request: ScholarshipRequest;

      if (existing) {
        // Une demande retirée peut être reprise : l'unicité (propriétaire, campagne) est conservée.
        request = await tx.scholarshipRequest.update({
          where: { id: existing.id },
          data: { status: 'DRAFT', version: { increment: 1 } },
        });
      } else {
        const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`
          SELECT nextval('scholarship_request_number_seq') AS n`;

        request = await tx.scholarshipRequest.create({
          data: {
            ...ownerColumns(owner),
            ...prefill,
            campaignId,
            type: campaign.type,
            reference: formatRequestReference(
              campaign.type,
              Number(campaign.academicYear.code.slice(0, 4)),
              n,
            ),
          },
        });
      }

      await this.recordTransition(
        tx,
        request.id,
        existing ? 'WITHDRAWN' : null,
        'DRAFT',
        owner,
        existing ? 'Demande reprise' : null,
      );
      await this.audit.record(
        {
          actor: ownerActor(owner, ip),
          action: 'REQUEST_CREATED',
          entityType: 'ScholarshipRequest',
          entityId: request.id,
          metadata: { reference: request.reference, campaignId },
        },
        tx,
      );

      return request.id;
    });

    return this.getForOwner(owner, requestId);
  }

  async update(owner: RequestOwner, requestId: string, data: UpdateRequestDto) {
    const request = await this.loadOwned(owner, requestId);

    this.assertEditable(request);

    if (data.version !== undefined && data.version !== request.version) {
      throw new ConflictException(
        'La demande a été modifiée entre-temps : rechargez la page',
      );
    }

    const changes = Object.fromEntries(
      EDITABLE_FIELDS[request.type]
        .filter((field) => data[field] !== undefined)
        .map((field) => [field, data[field]]),
    ) as Prisma.ScholarshipRequestUpdateManyMutationInput;
    const { count } = await this.prisma.scholarshipRequest.updateMany({
      where: { id: request.id, version: request.version },
      data: { ...changes, version: { increment: 1 } },
    });

    if (count === 0) {
      throw new ConflictException(
        'La demande a été modifiée entre-temps : rechargez la page',
      );
    }

    return this.getForOwner(owner, requestId);
  }

  async submit(owner: RequestOwner, requestId: string, ip?: string | null) {
    const now = new Date();
    const request = await this.loadOwned(owner, requestId);

    this.transitionOrConflict(request.status, 'SUBMITTED');

    const missingFields = REQUIRED_FIELDS[request.type].filter(
      (field) => request[field] === null || request[field] === undefined,
    );
    const uploaded = new Map(
      request.documents.map((document) => [
        document.documentTypeCode,
        document,
      ]),
    );
    const missingDocuments = requirementsFor(
      request.campaign.requirements,
      request.targetLevel,
    )
      .filter((requirement) => requirement.isRequired)
      .filter((requirement) => {
        const document = uploaded.get(requirement.documentTypeCode);

        return !document?.storagePath || document.status === 'REJECTED';
      })
      .map((requirement) => ({
        documentTypeCode: requirement.documentTypeCode,
        label: requirement.documentType.label,
      }));

    if (missingFields.length > 0 || missingDocuments.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Dossier incomplet',
        missingFields,
        missingDocuments,
      });
    }

    const eligibility = await this.evaluate(
      owner,
      request,
      request.campaign,
      now,
    );
    // Réponse à une demande de complément : possible même après la clôture de la campagne.
    const blockers = eligibility.blockers.filter(
      (issue) =>
        !(request.status === 'INCOMPLETE' && issue.code === 'CAMPAIGN_CLOSED'),
    );

    if (blockers.length > 0) {
      throw new UnprocessableEntityException({
        message: blockers[0].message,
        blockers,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.scholarshipRequest.updateMany({
        where: { id: request.id, version: request.version },
        data: {
          status: 'SUBMITTED',
          submittedAt: now,
          honorDeclarationAt: now,
          eligibilityWarnings: eligibility.warnings,
          version: { increment: 1 },
        },
      });

      if (count === 0) {
        throw new ConflictException(
          'La demande a été modifiée entre-temps : rechargez la page',
        );
      }

      await this.recordTransition(
        tx,
        request.id,
        request.status,
        'SUBMITTED',
        owner,
      );
      await this.notifications.notify(
        ownerRecipient(owner),
        {
          type: 'REQUEST_SUBMITTED',
          title: `Demande ${request.reference} soumise`,
          body: 'Votre dossier a bien été transmis au SGEE. Vous serez notifié de chaque étape.',
          link: this.linkFor(owner, request.id),
        },
        tx,
      );
      await this.audit.record(
        {
          actor: ownerActor(owner, ip),
          action: 'REQUEST_SUBMITTED',
          entityType: 'ScholarshipRequest',
          entityId: request.id,
          metadata: {
            reference: request.reference,
            warnings: eligibility.warnings.map((warning) => warning.code),
          },
        },
        tx,
      );
    });

    return this.getForOwner(owner, requestId);
  }

  async withdraw(owner: RequestOwner, requestId: string, ip?: string | null) {
    const request = await this.loadOwned(owner, requestId);

    this.transitionOrConflict(request.status, 'WITHDRAWN');

    await this.prisma.$transaction(async (tx) => {
      await tx.scholarshipRequest.update({
        where: { id: request.id },
        data: { status: 'WITHDRAWN', version: { increment: 1 } },
      });
      await this.recordTransition(
        tx,
        request.id,
        request.status,
        'WITHDRAWN',
        owner,
      );
      await this.audit.record(
        {
          actor: ownerActor(owner, ip),
          action: 'REQUEST_WITHDRAWN',
          entityType: 'ScholarshipRequest',
          entityId: request.id,
          metadata: { reference: request.reference },
        },
        tx,
      );
    });

    return this.getForOwner(owner, requestId);
  }

  async uploadDocument(
    owner: RequestOwner,
    requestId: string,
    documentTypeCode: string,
    file: Express.Multer.File | undefined,
  ) {
    const request = await this.loadOwned(owner, requestId);

    this.assertEditable(request);

    const requirement = request.campaign.requirements.find(
      (item) => item.documentTypeCode === documentTypeCode,
    );

    if (!requirement) {
      throw new BadRequestException(
        'Cette pièce n’est pas demandée pour cette campagne',
      );
    }

    const existing = request.documents.find(
      (document) => document.documentTypeCode === documentTypeCode,
    );

    if (existing?.status === 'VALIDATED') {
      throw new ConflictException('Cette pièce est déjà validée');
    }

    const stored = await this.files.store(file);
    const fileData = {
      status: 'PENDING' as const,
      required: requirement.isRequired,
      fileName: stored.fileName,
      originalName: stored.originalName,
      mimeType: stored.mimeType,
      size: stored.size,
      storagePath: stored.storagePath,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewComment: null,
    };

    try {
      await this.prisma.requestDocument.upsert({
        where: {
          requestId_documentTypeCode: { requestId, documentTypeCode },
        },
        update: fileData,
        create: { requestId, documentTypeCode, ...fileData },
      });
    } catch (error) {
      await this.files.remove(stored.storagePath);
      throw error;
    }

    await this.files.remove(existing?.storagePath);

    return this.getForOwner(owner, requestId);
  }

  async removeDocument(
    owner: RequestOwner,
    requestId: string,
    documentId: string,
  ) {
    const request = await this.loadOwned(owner, requestId);

    this.assertEditable(request);

    const document = request.documents.find((item) => item.id === documentId);

    if (!document) {
      throw new NotFoundException('Pièce introuvable');
    }

    if (document.status === 'VALIDATED') {
      throw new ConflictException('Cette pièce est déjà validée');
    }

    await this.prisma.requestDocument.delete({ where: { id: document.id } });
    await this.files.remove(document.storagePath);

    return this.getForOwner(owner, requestId);
  }

  async downloadDocument(
    owner: RequestOwner,
    requestId: string,
    documentId: string,
  ) {
    const request = await this.loadOwned(owner, requestId);
    const document = request.documents.find((item) => item.id === documentId);

    if (!document) {
      throw new NotFoundException('Pièce introuvable');
    }

    return this.files.resolveDownload(document);
  }

  /** Éligibilité évaluée sur les données actuelles du propriétaire. */
  async evaluate(
    owner: RequestOwner,
    request: ScholarshipRequest | null,
    campaign: CampaignWithRelations,
    now: Date,
  ): Promise<EligibilityResult> {
    const hasOtherActiveRequest =
      (await this.prisma.scholarshipRequest.count({
        where: {
          ...ownerColumns(owner),
          campaignId: campaign.id,
          status: { not: 'WITHDRAWN' },
          ...(request ? { id: { not: request.id } } : {}),
        },
      })) > 0;
    const base = {
      type: campaign.type,
      now,
      campaign,
      hasOtherActiveRequest,
      targetLevel: request?.targetLevel ?? null,
    };

    if (owner.kind === 'APPLICANT') {
      const applicant = await this.prisma.applicant.findUniqueOrThrow({
        where: { id: owner.id },
        select: { birthDate: true },
      });

      return evaluateEligibility({ ...base, birthDate: applicant.birthDate });
    }

    const [student, history] = await Promise.all([
      this.prisma.student.findUniqueOrThrow({
        where: { id: owner.id },
        select: { birthDate: true, scholarshipStatus: true, endDate: true },
      }),
      // Années antérieures à l'année N-1 (celle-ci est l'entrée « courante »).
      this.prisma.cursusEntry.findMany({
        where: { studentId: owner.id, isCurrent: false },
        select: { levelCode: true, result: true },
      }),
    ]);

    return evaluateEligibility({
      ...base,
      birthDate: student.birthDate,
      scholarshipStatus: student.scholarshipStatus,
      scholarshipEndDate: student.endDate,
      academicYearStartsOn: campaign.academicYear.startsOn,
      previousLevel: request?.previousLevel ?? null,
      previousResult: request?.previousResult ?? null,
      changedField: request?.changedField ?? false,
      cursusHistory: history,
    });
  }

  private async loadOwned(owner: RequestOwner, requestId: string) {
    const request = await this.prisma.scholarshipRequest.findFirst({
      where: { id: requestId, ...ownerColumns(owner) },
      include: requestInclude,
    });

    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    return request;
  }

  /** Pré-remplissage du renouvellement à partir du dossier du boursier. */
  private async renewalPrefill(studentId: string) {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      select: {
        levelCode: true,
        field: true,
        academy: true,
        country: true,
        cursus: {
          where: { isCurrent: true },
          select: { institution: true },
          take: 1,
        },
      },
    });

    return {
      previousLevel: student.levelCode,
      fieldOfStudy: student.field,
      city: student.academy,
      country: student.country,
      institution: student.cursus[0]?.institution ?? null,
    };
  }

  private assertEditable(request: ScholarshipRequest) {
    if (!isEditableByOwner(request.status)) {
      throw new ConflictException(
        `Demande « ${REQUEST_STATUS_LABELS[request.status]} » : modification impossible`,
      );
    }
  }

  private transitionOrConflict(from: RequestStatus, to: RequestStatus) {
    try {
      assertTransition(from, to, 'OWNER');
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  private recordTransition(
    tx: Prisma.TransactionClient,
    requestId: string,
    fromStatus: RequestStatus | null,
    toStatus: RequestStatus,
    owner: RequestOwner,
    comment: string | null = null,
  ) {
    return tx.requestStatusHistory.create({
      data: {
        requestId,
        fromStatus,
        toStatus,
        actorType: owner.kind,
        actorId: owner.id,
        comment,
      },
    });
  }

  private linkFor(owner: RequestOwner, requestId: string) {
    return owner.kind === 'STUDENT'
      ? `/portal/renouvellement?demande=${requestId}`
      : `/candidature?demande=${requestId}`;
  }
}
