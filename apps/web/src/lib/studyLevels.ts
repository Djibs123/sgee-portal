import type { AcademicResult } from './api/requests'

/** Miroir des niveaux de l'API (`StudyLevel`), regroupés par cycle pour le formulaire. */
export const STUDY_LEVEL_GROUPS: Array<{ cycle: string; levels: Array<{ code: string; label: string }> }> = [
  {
    cycle: 'Classes préparatoires et BTS',
    levels: [
      { code: 'PREPA1', label: 'Classe préparatoire 1re année' },
      { code: 'PREPA2', label: 'Classe préparatoire 2e année' },
      { code: 'BTS1', label: 'BTS 1re année' },
      { code: 'BTS2', label: 'BTS 2e année' },
    ],
  },
  {
    cycle: 'Licence',
    levels: [
      { code: 'L1', label: 'Licence 1' },
      { code: 'L2', label: 'Licence 2' },
      { code: 'L3', label: 'Licence 3' },
    ],
  },
  {
    cycle: 'Master',
    levels: [
      { code: 'M1', label: 'Master 1' },
      { code: 'M2', label: 'Master 2' },
    ],
  },
  {
    cycle: 'Cycle ingénieur',
    levels: [
      { code: 'ING1', label: 'Cycle ingénieur 1re année' },
      { code: 'ING2', label: 'Cycle ingénieur 2e année' },
      { code: 'ING3', label: 'Cycle ingénieur 3e année' },
    ],
  },
  {
    cycle: 'Doctorat',
    levels: [
      { code: 'D1', label: 'Doctorat 1re année' },
      { code: 'D2', label: 'Doctorat 2e année' },
      { code: 'D3', label: 'Doctorat 3e année' },
      { code: 'D4', label: 'Doctorat 4e année (dérogation)' },
    ],
  },
  { cycle: 'Autre', levels: [{ code: 'OTHER', label: 'Autre formation' }] },
]

export const ACADEMIC_RESULT_LABELS: Record<AcademicResult, string> = {
  PASSED: 'Admis (année validée)',
  REPEATED: 'Redoublement',
  FAILED: 'Ajourné',
}

/** Libellés des champs, pour les messages « champs manquants » de l'API. */
export const REQUEST_FIELD_LABELS: Record<string, string> = {
  targetLevel: 'niveau demandé',
  institution: 'établissement',
  country: 'pays',
  fieldOfStudy: 'filière',
  previousLevel: 'niveau de l’année précédente',
  previousResult: 'résultat de l’année précédente',
}
