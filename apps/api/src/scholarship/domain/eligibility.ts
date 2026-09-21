import type {
  AcademicResult,
  CampaignType,
  ScholarshipStatus,
  StudyLevel,
} from '../../generated/prisma/client';
import { campaignPhase, type CampaignWindow } from './campaign';
import {
  compareWithinCycle,
  cycleOf,
  DOCTORATE_COVERED_YEARS,
  FINAL_YEAR_LEVELS,
  STUDY_LEVELS,
} from './study-levels';

export type EligibilityIssue = {
  code: string;
  message: string;
};

export type EligibilityResult = {
  /** Faux si au moins un blocage empêche la soumission. */
  eligible: boolean;
  blockers: EligibilityIssue[];
  /** Points d'attention pour l'instructeur : jamais appliqués automatiquement. */
  warnings: EligibilityIssue[];
};

export type CursusRecord = {
  levelCode: StudyLevel | null;
  result: AcademicResult | null;
};

export type EligibilityInput = {
  type: CampaignType;
  now: Date;
  campaign: CampaignWindow & { maxAgeNonDoctoral: number | null };
  hasOtherActiveRequest: boolean;
  birthDate: Date | null;
  targetLevel: StudyLevel | null;
  // Renouvellement
  scholarshipStatus?: ScholarshipStatus;
  scholarshipEndDate?: Date | null;
  academicYearStartsOn?: Date | null;
  previousLevel?: StudyLevel | null;
  previousResult?: AcademicResult | null;
  changedField?: boolean;
  /** Années antérieures à l'année N-1 (celle-ci est décrite par previousLevel/previousResult). */
  cursusHistory?: CursusRecord[];
};

const DEFAULT_MAX_AGE = 30;

export function ageOn(birthDate: Date, date: Date) {
  const age = date.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    date.getUTCMonth() < birthDate.getUTCMonth() ||
    (date.getUTCMonth() === birthDate.getUTCMonth() &&
      date.getUTCDate() < birthDate.getUTCDate());

  return beforeBirthday ? age - 1 : age;
}

/**
 * Règles issues du règlement SGEE (sgee-sn.org) :
 * - renouvellement pendant la campagne annuelle, bourse non annulée ni terminée ;
 * - un seul redoublement par cycle ; pas de redoublement en M2 / 3e année
 *   d'ingénieur sans dérogation ; doctorat couvert 3 ans ;
 * - candidature : 30 ans maximum hors doctorat.
 */
export function evaluateEligibility(
  input: EligibilityInput,
): EligibilityResult {
  const blockers: EligibilityIssue[] = [];
  const warnings: EligibilityIssue[] = [];

  if (campaignPhase(input.campaign, input.now) !== 'OPEN') {
    blockers.push({
      code: 'CAMPAIGN_CLOSED',
      message: 'La campagne n’est pas ouverte aux dépôts.',
    });
  }

  if (input.hasOtherActiveRequest) {
    blockers.push({
      code: 'DUPLICATE_REQUEST',
      message: 'Une demande existe déjà pour cette campagne.',
    });
  }

  if (input.targetLevel === 'D4') {
    warnings.push({
      code: 'DOCTORATE_BEYOND_COVERAGE',
      message: `Doctorat au-delà de ${DOCTORATE_COVERED_YEARS} ans : dérogation avec lettre du directeur de thèse.`,
    });
  }

  if (input.type === 'NEW_APPLICATION') {
    const maxAge = input.campaign.maxAgeNonDoctoral ?? DEFAULT_MAX_AGE;
    const isDoctorate =
      input.targetLevel !== null && cycleOf(input.targetLevel) === 'DOCTORAT';

    if (
      input.birthDate &&
      !isDoctorate &&
      ageOn(input.birthDate, input.now) > maxAge
    ) {
      blockers.push({
        code: 'AGE_LIMIT',
        message: `Âge limite de ${maxAge} ans dépassé (hors doctorat).`,
      });
    }

    return { eligible: blockers.length === 0, blockers, warnings };
  }

  if (
    input.scholarshipStatus === 'CANCELLED' ||
    input.scholarshipStatus === 'COMPLETED'
  ) {
    blockers.push({
      code: 'SCHOLARSHIP_NOT_RENEWABLE',
      message:
        input.scholarshipStatus === 'CANCELLED'
          ? 'Votre bourse est annulée : un recours est nécessaire.'
          : 'Votre bourse est arrivée à son terme.',
    });
  }

  if (input.scholarshipStatus === 'SUSPENDED') {
    warnings.push({
      code: 'SCHOLARSHIP_SUSPENDED',
      message: 'Bourse suspendue : la reprise des études doit être justifiée.',
    });
  }

  if (
    input.scholarshipEndDate &&
    input.academicYearStartsOn &&
    input.scholarshipEndDate < input.academicYearStartsOn
  ) {
    warnings.push({
      code: 'SCHOLARSHIP_END_PASSED',
      message: 'La date de fin de bourse précède l’année demandée.',
    });
  }

  const { previousLevel, previousResult, targetLevel } = input;

  if (previousResult === 'REPEATED' && previousLevel) {
    if (FINAL_YEAR_LEVELS.has(previousLevel)) {
      warnings.push({
        code: 'REPEAT_FINAL_YEAR',
        message: `Redoublement en ${STUDY_LEVELS[previousLevel].label} : autorisé uniquement par dérogation.`,
      });
    }

    const cycle = cycleOf(previousLevel);
    const earlierRepeatInCycle = (input.cursusHistory ?? []).some(
      (entry) =>
        entry.result === 'REPEATED' &&
        entry.levelCode !== null &&
        cycleOf(entry.levelCode) === cycle,
    );

    if (earlierRepeatInCycle) {
      warnings.push({
        code: 'SECOND_REPEAT_IN_CYCLE',
        message:
          'Deuxième redoublement dans le même cycle : le règlement prévoit l’annulation.',
      });
    }
  }

  if (previousResult === 'FAILED') {
    warnings.push({
      code: 'PREVIOUS_YEAR_FAILED',
      message: 'Année précédente non validée (ajourné).',
    });
  }

  if (input.changedField) {
    warnings.push({
      code: 'FIELD_CHANGE',
      message: 'Changement de filière à justifier.',
    });
  }

  if (previousLevel && targetLevel) {
    const progression = compareWithinCycle(previousLevel, targetLevel);

    if (progression !== null && progression < 0) {
      warnings.push({
        code: 'LEVEL_REGRESSION',
        message:
          'Le niveau demandé est inférieur au niveau de l’année précédente.',
      });
    }

    if (previousResult === 'PASSED' && progression === 0) {
      warnings.push({
        code: 'INCONSISTENT_PROGRESSION',
        message: 'Année déclarée réussie mais niveau identique demandé.',
      });
    }

    if (
      previousResult === 'REPEATED' &&
      progression !== null &&
      progression > 0
    ) {
      warnings.push({
        code: 'INCONSISTENT_PROGRESSION',
        message: 'Redoublement déclaré mais niveau supérieur demandé.',
      });
    }
  }

  return { eligible: blockers.length === 0, blockers, warnings };
}
