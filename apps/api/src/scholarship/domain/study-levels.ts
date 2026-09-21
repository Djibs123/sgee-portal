import type { StudyCycle, StudyLevel } from '../../generated/prisma/client';

type LevelInfo = {
  cycle: StudyCycle;
  /** Année dans le cycle (1 = première année). */
  year: number;
  label: string;
};

export const STUDY_LEVELS: Record<StudyLevel, LevelInfo> = {
  PREPA1: { cycle: 'PREPA', year: 1, label: 'Classe préparatoire 1re année' },
  PREPA2: { cycle: 'PREPA', year: 2, label: 'Classe préparatoire 2e année' },
  BTS1: { cycle: 'BTS', year: 1, label: 'BTS 1re année' },
  BTS2: { cycle: 'BTS', year: 2, label: 'BTS 2e année' },
  L1: { cycle: 'LICENCE', year: 1, label: 'Licence 1' },
  L2: { cycle: 'LICENCE', year: 2, label: 'Licence 2' },
  L3: { cycle: 'LICENCE', year: 3, label: 'Licence 3' },
  M1: { cycle: 'MASTER', year: 1, label: 'Master 1' },
  M2: { cycle: 'MASTER', year: 2, label: 'Master 2' },
  ING1: { cycle: 'INGENIEUR', year: 1, label: 'Cycle ingénieur 1re année' },
  ING2: { cycle: 'INGENIEUR', year: 2, label: 'Cycle ingénieur 2e année' },
  ING3: { cycle: 'INGENIEUR', year: 3, label: 'Cycle ingénieur 3e année' },
  D1: { cycle: 'DOCTORAT', year: 1, label: 'Doctorat 1re année' },
  D2: { cycle: 'DOCTORAT', year: 2, label: 'Doctorat 2e année' },
  D3: { cycle: 'DOCTORAT', year: 3, label: 'Doctorat 3e année' },
  D4: { cycle: 'DOCTORAT', year: 4, label: 'Doctorat 4e année' },
  OTHER: { cycle: 'OTHER', year: 1, label: 'Autre formation' },
};

export const cycleOf = (level: StudyLevel) => STUDY_LEVELS[level].cycle;

export const levelLabel = (level: StudyLevel) => STUDY_LEVELS[level].label;

/** Niveaux sans redoublement possible sauf dérogation (règlement SGEE). */
export const FINAL_YEAR_LEVELS: ReadonlySet<StudyLevel> = new Set([
  'M2',
  'ING3',
]);

/** Durée couverte par la bourse en doctorat ; au-delà, dérogation obligatoire. */
export const DOCTORATE_COVERED_YEARS = 3;

/**
 * Compare deux niveaux d'un même cycle. Renvoie `null` si les cycles diffèrent
 * (ex. L3 vers M1 : changement de cycle normal, pas une régression).
 */
export function compareWithinCycle(from: StudyLevel, to: StudyLevel) {
  if (cycleOf(from) !== cycleOf(to)) {
    return null;
  }

  return STUDY_LEVELS[to].year - STUDY_LEVELS[from].year;
}
