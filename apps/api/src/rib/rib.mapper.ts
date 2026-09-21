import type { Rib, RibStatus, Student } from '@prisma/client';

const ribStatusLabels: Record<RibStatus, string> = {
  PENDING: 'En attente de validation',
  VALIDATED: 'Validé',
  REJECTED: 'Refusé',
};

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

/** Vue étudiant : jamais l'IBAN complet, seulement sa version masquée. */
export function mapStudentRib(rib: Rib) {
  return {
    id: rib.id,
    banque: rib.bankName,
    titulaire: rib.holderName,
    bic: rib.bic,
    ibanMasked: rib.ibanMasked,
    adresse: rib.address,
    telephone: rib.phone,
    email: rib.email,
    status: rib.status,
    statusLabel: ribStatusLabels[rib.status],
    submittedAt: iso(rib.submittedAt),
    reviewedAt: iso(rib.reviewedAt),
    reviewComment: rib.reviewComment,
  };
}

export type StudentRibView = ReturnType<typeof mapStudentRib>;

type StudentMinimal = Pick<
  Student,
  'id' | 'studentNumber' | 'firstName' | 'lastName' | 'email'
>;

export type AdminRibContext = {
  activeRib: Rib | null;
  /** Nombre d'autres boursiers dont un RIB actif ou en attente porte le même IBAN. */
  sharedIbanCount: number;
};

export function mapAdminRib(
  rib: Rib & { student: StudentMinimal },
  context: AdminRibContext,
) {
  return {
    id: rib.id,
    bankName: rib.bankName,
    holderName: rib.holderName,
    ibanMasked: rib.ibanMasked,
    ibanLast4: rib.ibanLast4,
    bic: rib.bic,
    status: rib.status,
    statusLabel: ribStatusLabels[rib.status],
    submittedAt: iso(rib.submittedAt),
    reviewedAt: iso(rib.reviewedAt),
    reviewComment: rib.reviewComment,
    student: {
      id: rib.student.id,
      code: rib.student.studentNumber,
      firstName: rib.student.firstName,
      lastName: rib.student.lastName,
      email: rib.student.email,
    },
    activeRib: context.activeRib
      ? {
          bankName: context.activeRib.bankName,
          ibanMasked: context.activeRib.ibanMasked,
          validatedAt: iso(context.activeRib.reviewedAt),
        }
      : null,
    sharedIbanCount: context.sharedIbanCount,
  };
}
