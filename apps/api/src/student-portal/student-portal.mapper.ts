import type {
  CursusEntry,
  Payment,
  Rib,
  RibStatus,
  Student,
  StudentDocument,
  StudentDocumentStatus,
} from '@prisma/client';

const formatDate = (date: Date | null | undefined) =>
  date ? new Intl.DateTimeFormat('fr-FR').format(date) : '';

const formatDecimalAmount = (
  value: { toNumber: () => number } | null | undefined,
  currency = 'EUR',
) => {
  if (!value) {
    return '';
  }

  return `${value.toNumber().toFixed(2).replace('.', ',')} ${currency}`;
};

const formatCfaAmount = (value: number | null | undefined) =>
  value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';

const documentStatusLabels: Record<StudentDocumentStatus, string> = {
  REQUIRED: 'Requis',
  PENDING: 'En attente de validation',
  VALIDATED: 'Valide',
  REJECTED: 'Refuse',
};

const ribStatusLabels: Record<RibStatus, string> = {
  PENDING: 'En attente de validation',
  VALIDATED: 'Valide',
  REJECTED: 'Refuse',
};

export function mapStudentProfile(student: Student) {
  const fullName = `${student.firstName} ${student.lastName}`;
  const currency = student.allocationCurrency ?? 'EUR';
  const allocationBase = formatDecimalAmount(
    student.allocationMonthlyAmount,
    currency,
  );
  const cfaAmount = formatCfaAmount(student.allocationCfaAmount);

  return {
    id: student.id,
    studentNumber: student.studentNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    fullName,
    email: student.email,
    scholarshipStatus: student.scholarshipStatus,
    codeEtudiant: student.studentNumber,
    matricule: student.matricule ?? '',
    nom: student.lastName.toUpperCase(),
    prenom: student.firstName,
    niveau: student.level ?? '',
    filiere: student.field ?? '',
    academie: student.academy ?? '',
    pays: student.country ?? '',
    anneeScolaire: student.academicYear ?? '',
    statutBourse: student.scholarshipStatus,
    typeBourse: student.scholarshipType ?? '',
    modePaiement: student.paymentMethod ?? '',
    dateNaissance: formatDate(student.birthDate),
    villeNaissance: student.birthCity ?? '',
    paysNaissance: student.birthCountry ?? '',
    sexe: student.gender ?? '',
    situation: student.familySituation ?? '',
    budget: student.budget ?? '',
    dateDebut: formatDate(student.startDate),
    dateFin: formatDate(student.endDate),
    dernierTraitement: formatDate(student.lastProcessingDate),
    dateArrivee: formatDate(student.arrivalDate),
    numAttribution: student.attributionNumber ?? '',
    allocationMensuelle: cfaAmount
      ? `${cfaAmount} F (${allocationBase})`
      : allocationBase,
    allocationBase,
    totalVerse: formatDecimalAmount(student.totalPaidAmount, currency),
    progression: student.progressPercent ?? 0,
  };
}

export function mapRib(rib: Rib) {
  return {
    studentId: rib.studentId,
    banque: rib.bankName,
    titulaire: rib.holderName,
    iban: rib.iban,
    bic: rib.bic,
    adresse: rib.address,
    telephone: rib.phone,
    email: rib.email,
    status: rib.status,
    statusLabel: ribStatusLabels[rib.status],
    ibanMasked: rib.ibanMasked,
    updatedAt: rib.updatedAt.toISOString(),
  };
}

export function mapCursusEntry(entry: CursusEntry) {
  return {
    studentId: entry.studentId,
    annee: entry.academicYear,
    etablissement: entry.institution,
    niveau: entry.level,
    specialite: entry.specialty,
    diplome: entry.diploma,
    statut: entry.status,
    actuel: entry.isCurrent,
  };
}

export function mapPayment(payment: Payment) {
  return {
    studentId: payment.studentId,
    mois: payment.month,
    annee: payment.academicYear,
    date: formatDate(payment.paymentDate),
    montant: formatDecimalAmount(payment.amount, payment.currency),
    devise: payment.currency,
    base: formatDecimalAmount(payment.baseAmount, payment.currency),
    statut: payment.status,
  };
}

export function mapStudentDocument(document: StudentDocument) {
  return {
    id: document.id,
    studentId: document.studentId,
    nom: document.name,
    type: document.type,
    status: document.status,
    statusLabel: documentStatusLabels[document.status],
    statut: document.status,
    obligatoire: document.required,
    dateDepot: document.submittedAt ? formatDate(document.submittedAt) : null,
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    isDownloadable: Boolean(
      document.storagePath && document.originalName && document.mimeType,
    ),
  };
}
