import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { StudentDocumentStatus } from '@prisma/client';
import {
  UploadedFilesService,
  type StoredUpload,
} from '../common/uploads/uploaded-files.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UploadDocumentDto } from './student-portal.dto';
import {
  mapCursusEntry,
  mapPayment,
  mapStudentDocument,
  mapStudentProfile,
} from './student-portal.mapper';

/** Seuls les documents attendus ou refusés peuvent recevoir un nouveau fichier. */
const REPLACEABLE_STATUSES: StudentDocumentStatus[] = ['REQUIRED', 'REJECTED'];

function submissionData(stored: StoredUpload) {
  const now = new Date();

  return {
    status: 'PENDING' as const,
    submittedAt: now,
    uploadedAt: now,
    reviewedAt: null,
    reviewComment: null,
    fileName: stored.fileName,
    originalName: stored.originalName,
    mimeType: stored.mimeType,
    size: stored.size,
    storagePath: stored.storagePath,
  };
}

@Injectable()
export class StudentPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: UploadedFilesService,
  ) {}

  async getProfile(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: {
        id: studentId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return mapStudentProfile(student);
  }

  async getCursus(studentId: string) {
    const entries = await this.prisma.cursusEntry.findMany({
      where: {
        studentId,
      },
      orderBy: {
        academicYear: 'asc',
      },
    });

    return {
      items: entries.map(mapCursusEntry),
    };
  }

  async getPayments(studentId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        studentId,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    return {
      items: payments.map(mapPayment),
    };
  }

  async getDocuments(studentId: string) {
    const documents = await this.prisma.studentDocument.findMany({
      where: {
        studentId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      items: documents.map(mapStudentDocument),
    };
  }

  async getDocumentTypes() {
    const types = await this.prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: { code: true, label: true, description: true },
    });

    return { items: types };
  }

  async uploadDocument(
    studentId: string,
    data: UploadDocumentDto,
    file: Express.Multer.File | undefined,
  ) {
    const target = data.documentId
      ? await this.findOwnedDocument(studentId, data.documentId)
      : await this.prisma.studentDocument.findFirst({
          where: {
            studentId,
            type: data.type,
            status: { in: REPLACEABLE_STATUSES },
          },
          orderBy: { createdAt: 'asc' },
        });

    if (target && !REPLACEABLE_STATUSES.includes(target.status)) {
      throw new ConflictException(
        target.status === 'PENDING'
          ? 'Un dépôt est déjà en attente : annulez-le avant d’en envoyer un autre'
          : 'Ce document est déjà validé',
      );
    }

    const documentType = target
      ? null
      : await this.prisma.documentType.findFirst({
          where: { code: data.type, isActive: true },
        });

    if (!target && !documentType) {
      throw new BadRequestException('Type de document inconnu');
    }

    // Toutes les vérifications métier sont faites : le fichier peut être écrit.
    const stored = await this.files.store(file);

    try {
      const document = target
        ? await this.replaceFile(target.id, stored)
        : await this.prisma.studentDocument.create({
            data: {
              ...submissionData(stored),
              studentId,
              type: data.type,
              name: data.label?.trim() || documentType!.label,
              required: false,
            },
          });

      await this.files.remove(target?.storagePath);

      return mapStudentDocument(document);
    } catch (error) {
      await this.files.remove(stored.storagePath);
      throw error;
    }
  }

  async cancelDocumentSubmission(studentId: string, documentId: string) {
    const document = await this.findOwnedDocument(studentId, documentId);

    if (document.status !== 'PENDING') {
      throw new ConflictException(
        'Seuls les dépôts en attente peuvent être annulés',
      );
    }

    if (document.required) {
      await this.prisma.studentDocument.update({
        where: { id: document.id },
        data: {
          status: 'REQUIRED',
          submittedAt: null,
          reviewedAt: null,
          reviewComment: null,
          uploadedAt: null,
          fileName: null,
          originalName: null,
          mimeType: null,
          size: null,
          storagePath: null,
        },
      });
    } else {
      await this.prisma.studentDocument.delete({ where: { id: document.id } });
    }

    await this.files.remove(document.storagePath);

    return this.getDocuments(studentId);
  }

  async downloadDocument(studentId: string, documentId: string) {
    const document = await this.findOwnedDocument(studentId, documentId);

    return this.files.resolveDownload(document);
  }

  /** 404 aussi quand le document appartient à un autre étudiant : aucune fuite d'existence. */
  private async findOwnedDocument(studentId: string, documentId: string) {
    const document = await this.prisma.studentDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || document.studentId !== studentId) {
      throw new NotFoundException('Document introuvable');
    }

    return document;
  }

  /** Mise à jour conditionnelle : échoue si le statut a changé entre-temps (course). */
  private async replaceFile(documentId: string, stored: StoredUpload) {
    const { count } = await this.prisma.studentDocument.updateMany({
      where: { id: documentId, status: { in: REPLACEABLE_STATUSES } },
      data: submissionData(stored),
    });

    if (count === 0) {
      throw new ConflictException('Le document a changé, réessayez');
    }

    return this.prisma.studentDocument.findUniqueOrThrow({
      where: { id: documentId },
    });
  }
}
