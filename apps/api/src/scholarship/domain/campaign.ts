import type {
  CampaignType,
  StudyCycle,
  StudyLevel,
} from '../../generated/prisma/client';
import { cycleOf } from './study-levels';

export type CampaignWindow = {
  opensAt: Date;
  closesAt: Date;
  closedAt: Date | null;
};

export type CampaignPhase = 'UPCOMING' | 'OPEN' | 'CLOSED';

export const CAMPAIGN_PHASE_LABELS: Record<CampaignPhase, string> = {
  UPCOMING: 'À venir',
  OPEN: 'Ouverte',
  CLOSED: 'Clôturée',
};

/** Phase calculée à partir des dates : aucune tâche planifiée n'est nécessaire. */
export function campaignPhase(
  campaign: CampaignWindow,
  now: Date,
): CampaignPhase {
  const effectiveClose =
    campaign.closedAt && campaign.closedAt < campaign.closesAt
      ? campaign.closedAt
      : campaign.closesAt;

  if (now < campaign.opensAt) {
    return 'UPCOMING';
  }

  return now < effectiveClose ? 'OPEN' : 'CLOSED';
}

export type Requirement = {
  documentTypeCode: string;
  cycles: StudyCycle[];
  isRequired: boolean;
};

/** Pièces attendues pour un niveau visé : liste vide de cycles = toutes. */
export function requirementsFor<T extends Requirement>(
  requirements: T[],
  targetLevel: StudyLevel | null,
): T[] {
  const cycle = targetLevel ? cycleOf(targetLevel) : null;

  return requirements.filter(
    (requirement) =>
      requirement.cycles.length === 0 ||
      (cycle !== null && requirement.cycles.includes(cycle)),
  );
}

const REFERENCE_PREFIX: Record<CampaignType, string> = {
  RENEWAL: 'REN',
  NEW_APPLICATION: 'CAN',
};

/** Référence lisible et stable, ex. REN-2026-000123. */
export function formatRequestReference(
  type: CampaignType,
  academicYearStart: number,
  sequence: number | bigint,
) {
  return `${REFERENCE_PREFIX[type]}-${academicYearStart}-${String(sequence).padStart(6, '0')}`;
}
