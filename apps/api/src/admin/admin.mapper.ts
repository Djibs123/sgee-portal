import type {
  Student,
  StudentDocument,
  StudentDocumentStatus,
} from '../generated/prisma/client';

const formatDate = (date: Date | null | undefined) =>
  date ? new Intl.DateTimeFormat('fr-FR').format(date) : '';

const documentStatusLabels: Record<StudentDocumentStatus, string> = {
  REQUIRED: 'Requis',
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

const mapStudentMinimal = (student: StudentMinimal) => ({
  id: student.id,
  code: student.studentNumber,
  firstName: student.firstName,
  lastName: student.lastName,
  email: student.email,
});

/** Résumé étudiant pour le back-office : aucune donnée d'authentification. */
export function mapAdminStudentSummary(student: Student) {
  return {
    id: student.id,
    code: student.studentNumber,
    matricule: student.matricule,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    level: student.level,
    field: student.field,
    academicYear: student.academicYear,
    scholarshipStatus: student.scholarshipStatus,
    lastLoginAt: student.lastLoginAt?.toISOString() ?? null,
  };
}

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
