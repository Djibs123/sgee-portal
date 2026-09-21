import {
  campaignPhase,
  formatRequestReference,
  requirementsFor,
} from './campaign';
import {
  ageOn,
  evaluateEligibility,
  type EligibilityInput,
} from './eligibility';
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
  isEditableByOwner,
  isFinal,
} from './request-status';
import { compareWithinCycle } from './study-levels';

const campaign = {
  opensAt: new Date('2026-09-01T00:00:00Z'),
  closesAt: new Date('2027-01-01T00:00:00Z'),
  closedAt: null,
  maxAgeNonDoctoral: 30,
};
const duringCampaign = new Date('2026-10-15T10:00:00Z');

const renewal = (overrides: Partial<EligibilityInput> = {}) =>
  evaluateEligibility({
    type: 'RENEWAL',
    now: duringCampaign,
    campaign,
    hasOtherActiveRequest: false,
    birthDate: new Date('2002-05-10'),
    targetLevel: 'M1',
    scholarshipStatus: 'ACTIVE',
    previousLevel: 'L3',
    previousResult: 'PASSED',
    cursusHistory: [],
    ...overrides,
  });

const codes = (issues: { code: string }[]) => issues.map((issue) => issue.code);

describe('machine à états des demandes', () => {
  it('autorise le parcours nominal', () => {
    expect(canTransition('DRAFT', 'SUBMITTED', 'OWNER')).toBe(true);
    expect(canTransition('SUBMITTED', 'UNDER_REVIEW', 'ADMIN')).toBe(true);
    expect(canTransition('UNDER_REVIEW', 'INCOMPLETE', 'ADMIN')).toBe(true);
    expect(canTransition('INCOMPLETE', 'SUBMITTED', 'OWNER')).toBe(true);
    expect(canTransition('UNDER_REVIEW', 'APPROVED', 'ADMIN')).toBe(true);
  });

  it('réserve chaque transition au bon acteur', () => {
    expect(canTransition('SUBMITTED', 'APPROVED', 'OWNER')).toBe(false);
    expect(canTransition('DRAFT', 'SUBMITTED', 'ADMIN')).toBe(false);
    expect(canTransition('APPROVED', 'WITHDRAWN', 'OWNER')).toBe(false);
    expect(() => assertTransition('REJECTED', 'APPROVED', 'ADMIN')).toThrow(
      InvalidTransitionError,
    );
  });

  it('distingue états modifiables et finaux', () => {
    expect(isEditableByOwner('DRAFT')).toBe(true);
    expect(isEditableByOwner('INCOMPLETE')).toBe(true);
    expect(isEditableByOwner('SUBMITTED')).toBe(false);
    expect(isFinal('APPROVED')).toBe(true);
    expect(isFinal('UNDER_REVIEW')).toBe(false);
  });
});

describe('campagnes', () => {
  it('calcule la phase à partir des dates et de la clôture anticipée', () => {
    expect(campaignPhase(campaign, new Date('2026-08-31T23:59:59Z'))).toBe(
      'UPCOMING',
    );
    expect(campaignPhase(campaign, duringCampaign)).toBe('OPEN');
    expect(campaignPhase(campaign, new Date('2027-01-01T00:00:00Z'))).toBe(
      'CLOSED',
    );
    expect(
      campaignPhase(
        { ...campaign, closedAt: new Date('2026-10-01T00:00:00Z') },
        duringCampaign,
      ),
    ).toBe('CLOSED');
  });

  it('filtre les pièces selon le cycle visé', () => {
    const requirements = [
      {
        documentTypeCode: 'CERTIFICAT_INSCRIPTION',
        cycles: [],
        isRequired: true,
      },
      {
        documentTypeCode: 'LETTRE_DIRECTEUR_THESE',
        cycles: ['DOCTORAT' as const],
        isRequired: false,
      },
    ];

    expect(
      requirementsFor(requirements, 'M1').map((r) => r.documentTypeCode),
    ).toEqual(['CERTIFICAT_INSCRIPTION']);
    expect(requirementsFor(requirements, 'D4')).toHaveLength(2);
  });

  it('formate les références', () => {
    expect(formatRequestReference('RENEWAL', 2026, 123)).toBe(
      'REN-2026-000123',
    );
    expect(formatRequestReference('NEW_APPLICATION', 2026, 7n)).toBe(
      'CAN-2026-000007',
    );
  });
});

describe('éligibilité au renouvellement', () => {
  it('accepte un boursier actif qui passe dans le cycle suivant', () => {
    expect(renewal()).toEqual({ eligible: true, blockers: [], warnings: [] });
    expect(compareWithinCycle('L3', 'M1')).toBeNull();
  });

  it('bloque hors campagne, en doublon ou si la bourse est annulée', () => {
    const result = renewal({
      now: new Date('2027-02-01T00:00:00Z'),
      hasOtherActiveRequest: true,
      scholarshipStatus: 'CANCELLED',
    });

    expect(result.eligible).toBe(false);
    expect(codes(result.blockers)).toEqual([
      'CAMPAIGN_CLOSED',
      'DUPLICATE_REQUEST',
      'SCHOLARSHIP_NOT_RENEWABLE',
    ]);
  });

  it('signale un deuxième redoublement dans le même cycle', () => {
    const result = renewal({
      previousLevel: 'L2',
      previousResult: 'REPEATED',
      targetLevel: 'L2',
      cursusHistory: [{ levelCode: 'L1', result: 'REPEATED' }],
    });

    expect(result.eligible).toBe(true);
    expect(codes(result.warnings)).toContain('SECOND_REPEAT_IN_CYCLE');
  });

  it("n'alerte pas pour un redoublement dans un cycle précédent", () => {
    const result = renewal({
      previousLevel: 'M1',
      previousResult: 'REPEATED',
      targetLevel: 'M1',
      cursusHistory: [{ levelCode: 'L2', result: 'REPEATED' }],
    });

    expect(codes(result.warnings)).not.toContain('SECOND_REPEAT_IN_CYCLE');
  });

  it('signale le redoublement en M2 et la 4e année de doctorat', () => {
    expect(
      codes(
        renewal({
          previousLevel: 'M2',
          previousResult: 'REPEATED',
          targetLevel: 'M2',
        }).warnings,
      ),
    ).toContain('REPEAT_FINAL_YEAR');
    expect(
      codes(
        renewal({
          previousLevel: 'D3',
          previousResult: 'PASSED',
          targetLevel: 'D4',
        }).warnings,
      ),
    ).toContain('DOCTORATE_BEYOND_COVERAGE');
  });

  it('repère les incohérences de progression et les changements de filière', () => {
    expect(
      codes(renewal({ previousLevel: 'L2', targetLevel: 'L2' }).warnings),
    ).toContain('INCONSISTENT_PROGRESSION');
    expect(
      codes(renewal({ previousLevel: 'L3', targetLevel: 'L2' }).warnings),
    ).toContain('LEVEL_REGRESSION');
    expect(codes(renewal({ changedField: true }).warnings)).toContain(
      'FIELD_CHANGE',
    );
  });
});

describe('éligibilité à une première bourse', () => {
  const application = (birthDate: string, targetLevel: 'L1' | 'D1') =>
    evaluateEligibility({
      type: 'NEW_APPLICATION',
      now: duringCampaign,
      campaign,
      hasOtherActiveRequest: false,
      birthDate: new Date(birthDate),
      targetLevel,
    });

  it('applique la limite de 30 ans sauf en doctorat', () => {
    expect(application('1995-01-01', 'L1').eligible).toBe(false);
    expect(codes(application('1995-01-01', 'L1').blockers)).toEqual([
      'AGE_LIMIT',
    ]);
    expect(application('1995-01-01', 'D1').eligible).toBe(true);
    expect(application('2006-01-01', 'L1').eligible).toBe(true);
  });

  it("calcule l'âge au jour près", () => {
    expect(ageOn(new Date('1996-10-15'), duringCampaign)).toBe(30);
    expect(ageOn(new Date('1996-10-16'), duringCampaign)).toBe(29);
  });
});
