import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService, type AuditActor } from '../audit/audit.service';
import type { CampaignType, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AcademicYearDto,
  CampaignRequirementDto,
  CreateCampaignDto,
  UpdateAcademicYearDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';
import { mapCampaign, type CampaignWithRelations } from './scholarship.mapper';

export const campaignInclude = {
  academicYear: true,
  requirements: { include: { documentType: true } },
} satisfies Prisma.CampaignInclude;

function assertDates(opensAt: Date, closesAt: Date) {
  if (closesAt <= opensAt) {
    throw new BadRequestException(
      'La date de clôture doit suivre la date d’ouverture',
    );
  }
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Campagne de l'année universitaire courante (ou la plus récente à défaut). */
  async findCurrent(type: CampaignType): Promise<CampaignWithRelations | null> {
    const current = await this.prisma.campaign.findFirst({
      where: { type, academicYear: { isCurrent: true } },
      include: campaignInclude,
    });

    return (
      current ??
      this.prisma.campaign.findFirst({
        where: { type },
        orderBy: { opensAt: 'desc' },
        include: campaignInclude,
      })
    );
  }

  async getById(campaignId: string): Promise<CampaignWithRelations> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: campaignInclude,
    });

    if (!campaign) {
      throw new NotFoundException('Campagne introuvable');
    }

    return campaign;
  }

  /** Campagnes de l'année courante, pour la page publique. */
  async listPublic(now = new Date()) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { academicYear: { isCurrent: true } },
      include: campaignInclude,
      orderBy: { opensAt: 'asc' },
    });

    return { items: campaigns.map((campaign) => mapCampaign(campaign, now)) };
  }

  async listForAdmin(now = new Date()) {
    const [campaigns, counts] = await Promise.all([
      this.prisma.campaign.findMany({
        include: campaignInclude,
        orderBy: [{ opensAt: 'desc' }],
      }),
      this.prisma.scholarshipRequest.groupBy({
        by: ['campaignId', 'status'],
        _count: { _all: true },
      }),
    ]);

    return {
      items: campaigns.map((campaign) => ({
        ...mapCampaign(campaign, now),
        requestCounts: Object.fromEntries(
          counts
            .filter((count) => count.campaignId === campaign.id)
            .map((count) => [count.status, count._count._all]),
        ),
      })),
    };
  }

  async create(data: CreateCampaignDto, actor: AuditActor) {
    assertDates(data.opensAt, data.closesAt);

    // Une campagne par type et par année universitaire (renouvellement annuel).
    const existing = await this.prisma.campaign.findUnique({
      where: {
        type_academicYearId: {
          type: data.type,
          academicYearId: data.academicYearId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'Une campagne de ce type existe déjà pour cette année universitaire',
      );
    }

    const campaign = await this.prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          type: data.type,
          academicYearId: data.academicYearId,
          title: data.title,
          instructions: data.instructions ?? null,
          opensAt: data.opensAt,
          closesAt: data.closesAt,
          maxAgeNonDoctoral:
            data.type === 'NEW_APPLICATION'
              ? (data.maxAgeNonDoctoral ?? 30)
              : null,
          requirements: { create: this.requirementRows(data.requirements) },
        },
        include: campaignInclude,
      });

      await this.audit.record(
        {
          actor,
          action: 'CAMPAIGN_CREATED',
          entityType: 'Campaign',
          entityId: created.id,
          metadata: { type: created.type, title: created.title },
        },
        tx,
      );

      return created;
    });

    return mapCampaign(campaign);
  }

  async update(campaignId: string, data: UpdateCampaignDto, actor: AuditActor) {
    const existing = await this.getById(campaignId);

    assertDates(
      data.opensAt ?? existing.opensAt,
      data.closesAt ?? existing.closesAt,
    );

    const campaign = await this.prisma.$transaction(async (tx) => {
      if (data.requirements) {
        await tx.campaignRequirement.deleteMany({ where: { campaignId } });
      }

      const updated = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          title: data.title,
          instructions: data.instructions,
          opensAt: data.opensAt,
          closesAt: data.closesAt,
          maxAgeNonDoctoral: data.maxAgeNonDoctoral,
          ...(data.requirements && {
            requirements: { create: this.requirementRows(data.requirements) },
          }),
        },
        include: campaignInclude,
      });

      await this.audit.record(
        {
          actor,
          action: 'CAMPAIGN_UPDATED',
          entityType: 'Campaign',
          entityId: campaignId,
          metadata: { fields: Object.keys(data) },
        },
        tx,
      );

      return updated;
    });

    return mapCampaign(campaign);
  }

  /** Clôture anticipée : plus aucun nouveau dépôt, les demandes en cours restent instruites. */
  async close(campaignId: string, actor: AuditActor) {
    await this.getById(campaignId);

    const campaign = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.campaign.update({
        where: { id: campaignId },
        data: { closedAt: new Date() },
        include: campaignInclude,
      });

      await this.audit.record(
        {
          actor,
          action: 'CAMPAIGN_CLOSED',
          entityType: 'Campaign',
          entityId: campaignId,
        },
        tx,
      );

      return updated;
    });

    return mapCampaign(campaign);
  }

  async listAcademicYears() {
    const years = await this.prisma.academicYear.findMany({
      orderBy: { startsOn: 'desc' },
    });

    return {
      items: years.map((year) => ({
        id: year.id,
        code: year.code,
        label: year.label,
        startsOn: year.startsOn.toISOString().slice(0, 10),
        endsOn: year.endsOn.toISOString().slice(0, 10),
        isCurrent: year.isCurrent,
      })),
    };
  }

  async createAcademicYear(data: AcademicYearDto, actor: AuditActor) {
    assertDates(data.startsOn, data.endsOn);

    await this.prisma.$transaction(async (tx) => {
      if (data.isCurrent) {
        await tx.academicYear.updateMany({ data: { isCurrent: false } });
      }

      const year = await tx.academicYear.create({
        data: {
          code: data.code,
          label: data.code.replace('-', '/'),
          startsOn: data.startsOn,
          endsOn: data.endsOn,
          isCurrent: data.isCurrent ?? false,
        },
      });

      await this.audit.record(
        {
          actor,
          action: 'ACADEMIC_YEAR_CREATED',
          entityType: 'AcademicYear',
          entityId: year.id,
          metadata: { code: year.code },
        },
        tx,
      );
    });

    return this.listAcademicYears();
  }

  async updateAcademicYear(
    yearId: string,
    data: UpdateAcademicYearDto,
    actor: AuditActor,
  ) {
    const existing = await this.prisma.academicYear.findUnique({
      where: { id: yearId },
    });

    if (!existing) {
      throw new NotFoundException('Année universitaire introuvable');
    }

    assertDates(
      data.startsOn ?? existing.startsOn,
      data.endsOn ?? existing.endsOn,
    );

    await this.prisma.$transaction(async (tx) => {
      // Une seule année courante à la fois.
      if (data.isCurrent) {
        await tx.academicYear.updateMany({
          where: { id: { not: yearId } },
          data: { isCurrent: false },
        });
      }

      await tx.academicYear.update({
        where: { id: yearId },
        data: {
          startsOn: data.startsOn,
          endsOn: data.endsOn,
          isCurrent: data.isCurrent,
        },
      });
      await this.audit.record(
        {
          actor,
          action: 'ACADEMIC_YEAR_UPDATED',
          entityType: 'AcademicYear',
          entityId: yearId,
          metadata: { fields: Object.keys(data) },
        },
        tx,
      );
    });

    return this.listAcademicYears();
  }

  private requirementRows(requirements: CampaignRequirementDto[]) {
    return requirements.map((requirement, index) => ({
      documentTypeCode: requirement.documentTypeCode,
      cycles: requirement.cycles ?? [],
      isRequired: requirement.isRequired ?? true,
      sortOrder: index,
    }));
  }
}
