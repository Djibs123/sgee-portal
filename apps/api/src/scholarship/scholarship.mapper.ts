import type {
  AcademicYear,
  Campaign,
  CampaignRequirement,
  DocumentType,
  RequestDocument,
  RequestStatusHistory,
  ScholarshipRequest,
  StudentDocumentStatus,
} from '../generated/prisma/client';
import {
  CAMPAIGN_PHASE_LABELS,
  campaignPhase,
  requirementsFor,
} from './domain/campaign';
import type { EligibilityResult } from './domain/eligibility';
import {
  isEditableByOwner,
  REQUEST_STATUS_LABELS,
} from './domain/request-status';
import { levelLabel } from './domain/study-levels';

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

const documentStatusLabels: Record<StudentDocumentStatus, string> = {
  REQUIRED: 'À fournir',
  PENDING: 'Déposée',
  VALIDATED: 'Validée',
  REJECTED: 'À remplacer',
};

export type CampaignWithRelations = Campaign & {
  academicYear: AcademicYear;
  requirements: Array<CampaignRequirement & { documentType: DocumentType }>;
};

export function mapCampaign(campaign: CampaignWithRelations, now = new Date()) {
  const phase = campaignPhase(campaign, now);

  return {
    id: campaign.id,
    type: campaign.type,
    title: campaign.title,
    instructions: campaign.instructions,
    academicYear: {
      id: campaign.academicYear.id,
      code: campaign.academicYear.code,
      label: campaign.academicYear.label,
    },
    opensAt: campaign.opensAt.toISOString(),
    closesAt: campaign.closesAt.toISOString(),
    closedAt: iso(campaign.closedAt),
    maxAgeNonDoctoral: campaign.maxAgeNonDoctoral,
    phase,
    phaseLabel: CAMPAIGN_PHASE_LABELS[phase],
    requirements: [...campaign.requirements]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((requirement) => ({
        documentTypeCode: requirement.documentTypeCode,
        label: requirement.documentType.label,
        description: requirement.documentType.description,
        cycles: requirement.cycles,
        isRequired: requirement.isRequired,
      })),
  };
}

export type RequestWithRelations = ScholarshipRequest & {
  campaign: CampaignWithRelations;
  documents: RequestDocument[];
  history: RequestStatusHistory[];
};

const toNumberString = (
  value: { toFixed: (digits: number) => string } | null,
) => (value ? value.toFixed(2) : null);

/**
 * Vue d'une demande : pièces attendues (selon le niveau visé) fusionnées avec les
 * pièces déposées, éligibilité et historique.
 */
export function mapRequest(
  request: RequestWithRelations,
  eligibility: EligibilityResult | null,
  now = new Date(),
) {
  const expected = requirementsFor(
    request.campaign.requirements,
    request.targetLevel,
  );
  const uploadedByType = new Map(
    request.documents.map((document) => [document.documentTypeCode, document]),
  );
  const documents = expected.map((requirement) => {
    const uploaded = uploadedByType.get(requirement.documentTypeCode);
    const status = uploaded?.storagePath ? uploaded.status : 'REQUIRED';

    return {
      id: uploaded?.id ?? null,
      documentTypeCode: requirement.documentTypeCode,
      label: requirement.documentType.label,
      description: requirement.documentType.description,
      required: requirement.isRequired,
      status,
      statusLabel: documentStatusLabels[status],
      originalName: uploaded?.originalName ?? null,
      submittedAt: iso(uploaded?.submittedAt),
      reviewComment: uploaded?.reviewComment ?? null,
      isDownloadable: Boolean(uploaded?.storagePath),
    };
  });

  return {
    id: request.id,
    reference: request.reference,
    type: request.type,
    status: request.status,
    statusLabel: REQUEST_STATUS_LABELS[request.status],
    isEditable: isEditableByOwner(request.status),
    version: request.version,
    campaign: mapCampaign(request.campaign, now),
    targetLevel: request.targetLevel,
    targetLevelLabel: request.targetLevel
      ? levelLabel(request.targetLevel)
      : null,
    institution: request.institution,
    city: request.city,
    country: request.country,
    fieldOfStudy: request.fieldOfStudy,
    programName: request.programName,
    previousLevel: request.previousLevel,
    previousLevelLabel: request.previousLevel
      ? levelLabel(request.previousLevel)
      : null,
    previousResult: request.previousResult,
    previousAverage: toNumberString(request.previousAverage),
    changedField: request.changedField,
    changedInstitution: request.changedInstitution,
    baccalaureateSeries: request.baccalaureateSeries,
    baccalaureateYear: request.baccalaureateYear,
    baccalaureateMention: request.baccalaureateMention,
    baccalaureateAverage: toNumberString(request.baccalaureateAverage),
    motivation: request.motivation,
    submittedAt: iso(request.submittedAt),
    decidedAt: iso(request.decidedAt),
    decisionComment: request.decisionComment,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    eligibility,
    documents,
    history: [...request.history]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((entry) => ({
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        toStatusLabel: REQUEST_STATUS_LABELS[entry.toStatus],
        actorType: entry.actorType,
        comment: entry.comment,
        createdAt: entry.createdAt.toISOString(),
      })),
  };
}

export type RequestView = ReturnType<typeof mapRequest>;

/** Résumé pour les listes (tableau de bord, file d'instruction). */
export function mapRequestSummary(
  request: ScholarshipRequest & { campaign: Pick<Campaign, 'title'> },
) {
  return {
    id: request.id,
    reference: request.reference,
    type: request.type,
    status: request.status,
    statusLabel: REQUEST_STATUS_LABELS[request.status],
    campaignTitle: request.campaign.title,
    targetLevel: request.targetLevel,
    targetLevelLabel: request.targetLevel
      ? levelLabel(request.targetLevel)
      : null,
    submittedAt: iso(request.submittedAt),
    decidedAt: iso(request.decidedAt),
    updatedAt: request.updatedAt.toISOString(),
  };
}
