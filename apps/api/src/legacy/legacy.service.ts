import { Injectable } from '@nestjs/common';
import type { AuthenticatedStudent } from '../auth/auth.service';

@Injectable()
export class LegacyService {
  getStudentRib(student: AuthenticatedStudent) {
    return {
      studentId: student.id,
      status: 'PENDING',
      bankName: 'Banque exemple',
      ibanMasked: 'FR76 **** **** **** **** **** 123',
      updatedAt: null,
    };
  }

  getStudentCursus(student: AuthenticatedStudent) {
    return {
      items: [
        {
          studentId: student.id,
          academicYear: '2025-2026',
          institution: 'Universite exemple',
          level: 'Licence 1',
          field: 'Informatique',
          status: 'CURRENT',
        },
      ],
    };
  }

  getStudentPayments(student: AuthenticatedStudent) {
    return {
      items: [
        {
          studentId: student.id,
          reference: 'PAY-MOCK-001',
          amount: 150000,
          currency: 'XAF',
          status: 'PENDING',
          paidAt: null,
        },
      ],
    };
  }

  getStudentDocuments(student: AuthenticatedStudent) {
    return {
      items: [
        {
          studentId: student.id,
          type: 'CERTIFICAT_SCOLARITE',
          label: 'Certificat de scolarite',
          status: 'MISSING',
          uploadedAt: null,
        },
      ],
    };
  }
}
