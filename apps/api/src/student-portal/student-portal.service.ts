import { existsSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateRibDto, UploadDocumentDto } from './student-portal.dto';
import {
  mapCursusEntry,
  mapPayment,
  mapRib,
  mapStudentDocument,
  mapStudentProfile,
} from './student-portal.mapper';
import { UPLOAD_DIR, uploadRoot } from './upload.config';

const maskIban = (iban: string) => {
  if (iban.length <= 8) {
    return iban;
  }

  return `${iban.slice(0, 4)} ${'*'.repeat(Math.max(iban.length - 8, 0))} ${iban.slice(-4)}`;
};

function isInsideDirectory(filePath: string, directoryPath: string) {
  return (
    filePath === directoryPath || filePath.startsWith(`${directoryPath}${sep}`)
  );
}

@Injectable()
export class StudentPortalService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getRib(studentId: string) {
    const rib = await this.prisma.rib.findUnique({
      where: {
        studentId,
      },
    });

    if (!rib) {
      throw new NotFoundException('Student RIB not found');
    }

    return mapRib(rib);
  }

  async updateRib(studentId: string, data: UpdateRibDto) {
    const student = await this.prisma.student.findUnique({
      where: {
        id: studentId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const existingRib = await this.prisma.rib.findUnique({
      where: {
        studentId,
      },
    });

    const rib = await this.prisma.rib.upsert({
      where: {
        studentId,
      },
      update: {
        bankName: data.banque,
        iban: data.iban,
        ibanMasked: maskIban(data.iban),
        address: data.adresse ?? existingRib?.address ?? '',
        phone: data.telephone ?? existingRib?.phone ?? '',
        email: data.email ?? existingRib?.email ?? student.email,
      },
      create: {
        studentId,
        bankName: data.banque,
        holderName: `${student.firstName} ${student.lastName}`,
        iban: data.iban,
        ibanMasked: maskIban(data.iban),
        bic: '',
        address: data.adresse ?? '',
        phone: data.telephone ?? '',
        email: data.email ?? student.email,
        status: 'VALIDATED',
      },
    });

    return mapRib(rib);
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

  async uploadDocument(
    studentId: string,
    data: UploadDocumentDto,
    file: Express.Multer.File,
  ) {
    const submittedAt = new Date();
    const document = await this.prisma.studentDocument.create({
      data: {
        studentId,
        name: data.label?.trim() || file.originalname,
        type: data.type,
        status: 'PROVIDED',
        required: false,
        submittedAt,
        uploadedAt: submittedAt,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: `${UPLOAD_DIR}/${file.filename}`,
      },
    });

    return mapStudentDocument(document);
  }

  async downloadDocument(studentId: string, documentId: string) {
    const document = await this.prisma.studentDocument.findUnique({
      where: {
        id: documentId,
      },
    });

    if (
      !document ||
      document.studentId !== studentId ||
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
}
