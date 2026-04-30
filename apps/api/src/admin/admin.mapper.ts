import type {
  Rib,
  Student,
  StudentDocument,
  StudentDocumentStatus,
  RibStatus,
} from '@prisma/client';

const formatDate = (date: Date | null | undefined) =>
  date ? new Intl.DateTimeFormat('fr-FR').format(date) : '';

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

type StudentMinimal = Pick<
  Student,
  'id' | 'studentNumber' | 'firstName' | 'lastName' | 'email'
>;

export type AdminDocumentWithStudent = StudentDocument & {
  student: StudentMinimal;
};

export type AdminRibWithStudent = Rib & {
  student: StudentMinimal;
};

const mapStudentMinimal = (student: StudentMinimal) => ({
  id: student.id,
  code: student.studentNumber,
  firstName: student.firstName,
  lastName: student.lastName,
  email: student.email,
});

export function mapAdminDocument(document: AdminDocumentWithStudent) {
  return {
    id: document.id,
    nom: document.name,
    type: document.type,
    status: document.status,
    statusLabel: documentStatusLabels[document.status],
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    uploadedAt: document.uploadedAt?.toISOString() ?? null,
    submittedAt: document.submittedAt?.toISOString() ?? null,
    submittedAtLabel: formatDate(document.submittedAt),
    reviewedAt: document.reviewedAt?.toISOString() ?? null,
    reviewedAtLabel: formatDate(document.reviewedAt),
    reviewComment: document.reviewComment,
    isDownloadable: Boolean(
      document.storagePath && document.originalName && document.mimeType,
    ),
    student: mapStudentMinimal(document.student),
  };
}

export function mapAdminRib(rib: AdminRibWithStudent) {
  return {
    id: rib.id,
    bankName: rib.bankName,
    holderName: rib.holderName,
    iban: rib.iban,
    ibanMasked: rib.ibanMasked,
    bic: rib.bic,
    status: rib.status,
    statusLabel: ribStatusLabels[rib.status],
    submittedAt: rib.submittedAt?.toISOString() ?? null,
    submittedAtLabel: formatDate(rib.submittedAt),
    reviewedAt: rib.reviewedAt?.toISOString() ?? null,
    reviewedAtLabel: formatDate(rib.reviewedAt),
    reviewComment: rib.reviewComment,
    student: mapStudentMinimal(rib.student),
  };
}
