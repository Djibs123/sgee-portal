import { existsSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uploadRoot } from '../student-portal/upload.config';
import type { OptionalReviewCommentDto, RejectDto } from './admin.dto';
import { mapAdminDocument, mapAdminRib } from './admin.mapper';

function isInsideDirectory(filePath: string, directoryPath: string) {
  return (
    filePath === directoryPath || filePath.startsWith(`${directoryPath}${sep}`)
  );
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingDocuments() {
    const documents = await this.prisma.studentDocument.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc',
      },
    });

    return {
      items: documents.map(mapAdminDocument),
    };
  }

  async downloadDocument(documentId: string) {
    const document = await this.prisma.studentDocument.findUnique({
      where: {
        id: documentId,
      },
    });

    if (
      !document ||
      !document.storagePath ||
      !document.originalName ||
      !document.mimeType
    ) {
      throw new NotFoundException('Document not found');
    }

    const rootPath = uploadRoot();

    if (!existsSync(rootPath)) {
      throw new NotFoundException('Document file not found');
    }

    const allowedRoot = realpathSync(rootPath);
    const resolvedPath = resolve(process.cwd(), document.storagePath);

    if (!existsSync(resolvedPath)) {
      throw new NotFoundException('Document file not found');
    }

    const realFilePath = realpathSync(resolvedPath);

    if (!isInsideDirectory(realFilePath, allowedRoot)) {
      throw new NotFoundException('Document not found');
    }

    return {
      absolutePath: realFilePath,
      mimeType: document.mimeType,
      originalName: document.originalName,
    };
  }

  async validateDocument(documentId: string, data: OptionalReviewCommentDto) {
    const document = await this.prisma.studentDocument.findUnique({
      where: {
        id: documentId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (
      document.status !== 'PENDING' ||
      !document.storagePath ||
      !document.originalName ||
      !document.mimeType
    ) {
      throw new ConflictException('Document cannot be reviewed');
    }

    const updatedDocument = await this.prisma.studentDocument.update({
      where: {
        id: document.id,
      },
      data: {
        status: 'VALIDATED',
        reviewedAt: new Date(),
        reviewComment: data.reviewComment ?? null,
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return mapAdminDocument(updatedDocument);
  }

  async rejectDocument(documentId: string, data: RejectDto) {
    const document = await this.prisma.studentDocument.findUnique({
      where: {
        id: documentId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (
      document.status !== 'PENDING' ||
      !document.storagePath ||
      !document.originalName ||
      !document.mimeType
    ) {
      throw new ConflictException('Document cannot be reviewed');
    }

    const updatedDocument = await this.prisma.studentDocument.update({
      where: {
        id: document.id,
      },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewComment: data.reviewComment,
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return mapAdminDocument(updatedDocument);
  }

  async getPendingRibs() {
    const ribs = await this.prisma.rib.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc',
      },
    });

    return {
      items: ribs.map(mapAdminRib),
    };
  }

  async validateRib(ribId: string, data: OptionalReviewCommentDto) {
    const rib = await this.prisma.rib.findUnique({
      where: {
        id: ribId,
      },
    });

    if (!rib) {
      throw new NotFoundException('RIB not found');
    }

    if (rib.status !== 'PENDING') {
      throw new ConflictException('RIB cannot be reviewed');
    }

    const updatedRib = await this.prisma.rib.update({
      where: {
        id: rib.id,
      },
      data: {
        status: 'VALIDATED',
        reviewedAt: new Date(),
        reviewComment: data.reviewComment ?? null,
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return mapAdminRib(updatedRib);
  }

  async rejectRib(ribId: string, data: RejectDto) {
    const rib = await this.prisma.rib.findUnique({
      where: {
        id: ribId,
      },
    });

    if (!rib) {
      throw new NotFoundException('RIB not found');
    }

    if (rib.status !== 'PENDING') {
      throw new ConflictException('RIB cannot be reviewed');
    }

    const updatedRib = await this.prisma.rib.update({
      where: {
        id: rib.id,
      },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewComment: data.reviewComment,
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return mapAdminRib(updatedRib);
  }
}
