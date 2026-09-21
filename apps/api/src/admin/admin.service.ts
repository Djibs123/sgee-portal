import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService, type AuditActor } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadedFilesService } from '../common/uploads/uploaded-files.service';
import type {
  ListStudentsQueryDto,
  OptionalReviewCommentDto,
  RejectDto,
} from './admin.dto';
import {
  mapAdminDocument,
  mapAdminRib,
  mapAdminStudentSummary,
} from './admin.mapper';

const studentMinimalSelect = {
  id: true,
  studentNumber: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.StudentSelect;

type ReviewDecision = 'VALIDATED' | 'REJECTED';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly files: UploadedFilesService,
  ) {}

  async listStudents({ search, page, pageSize }: ListStudentsQueryDto) {
    const where: Prisma.StudentWhereInput = search
      ? {
          OR: [
            { studentNumber: { contains: search, mode: 'insensitive' } },
            { matricule: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [total, students] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: students.map(mapAdminStudentSummary),
      page,
      pageSize,
      total,
    };
  }

  async getPendingDocuments() {
    const documents = await this.prisma.studentDocument.findMany({
      where: { status: 'PENDING' },
      include: { student: { select: studentMinimalSelect } },
      orderBy: { submittedAt: 'asc' },
    });

    return {
      items: documents.map(mapAdminDocument),
    };
  }

  async downloadDocument(documentId: string) {
    const document = await this.prisma.studentDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    return this.files.resolveDownload(document);
  }

  validateDocument(
    documentId: string,
    data: OptionalReviewCommentDto,
    actor: AuditActor,
  ) {
    return this.reviewDocument(
      documentId,
      'VALIDATED',
      data.reviewComment,
      actor,
    );
  }

  rejectDocument(documentId: string, data: RejectDto, actor: AuditActor) {
    return this.reviewDocument(
      documentId,
      'REJECTED',
      data.reviewComment,
      actor,
    );
  }

  async getPendingRibs() {
    const ribs = await this.prisma.rib.findMany({
      where: { status: 'PENDING' },
      include: { student: { select: studentMinimalSelect } },
      orderBy: { submittedAt: 'asc' },
    });

    return {
      items: ribs.map(mapAdminRib),
    };
  }

  validateRib(
    ribId: string,
    data: OptionalReviewCommentDto,
    actor: AuditActor,
  ) {
    return this.reviewRib(ribId, 'VALIDATED', data.reviewComment, actor);
  }

  rejectRib(ribId: string, data: RejectDto, actor: AuditActor) {
    return this.reviewRib(ribId, 'REJECTED', data.reviewComment, actor);
  }

  private async reviewDocument(
    documentId: string,
    decision: ReviewDecision,
    reviewComment: string | undefined,
    actor: AuditActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.studentDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException('Document introuvable');
      }

      if (
        document.status !== 'PENDING' ||
        !document.storagePath ||
        !document.originalName ||
        !document.mimeType
      ) {
        throw new ConflictException('Ce document ne peut pas être instruit');
      }

      const updatedDocument = await tx.studentDocument.update({
        where: { id: document.id },
        data: {
          status: decision,
          reviewedAt: new Date(),
          reviewComment: reviewComment ?? null,
        },
        include: { student: { select: studentMinimalSelect } },
      });

      await this.audit.record(
        {
          actor,
          action:
            decision === 'VALIDATED'
              ? 'DOCUMENT_VALIDATED'
              : 'DOCUMENT_REJECTED',
          entityType: 'StudentDocument',
          entityId: document.id,
          metadata: {
            studentId: document.studentId,
            type: document.type,
            reviewComment: reviewComment ?? null,
          },
        },
        tx,
      );

      return mapAdminDocument(updatedDocument);
    });
  }

  private async reviewRib(
    ribId: string,
    decision: ReviewDecision,
    reviewComment: string | undefined,
    actor: AuditActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rib = await tx.rib.findUnique({ where: { id: ribId } });

      if (!rib) {
        throw new NotFoundException('RIB introuvable');
      }

      if (rib.status !== 'PENDING') {
        throw new ConflictException('Ce RIB ne peut pas être instruit');
      }

      const updatedRib = await tx.rib.update({
        where: { id: rib.id },
        data: {
          status: decision,
          reviewedAt: new Date(),
          reviewComment: reviewComment ?? null,
        },
        include: { student: { select: studentMinimalSelect } },
      });

      await this.audit.record(
        {
          actor,
          action: decision === 'VALIDATED' ? 'RIB_VALIDATED' : 'RIB_REJECTED',
          entityType: 'Rib',
          entityId: rib.id,
          metadata: {
            studentId: rib.studentId,
            reviewComment: reviewComment ?? null,
          },
        },
        tx,
      );

      return mapAdminRib(updatedRib);
    });
  }
}
