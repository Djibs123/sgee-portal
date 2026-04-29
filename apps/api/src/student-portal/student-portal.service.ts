import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapCursusEntry,
  mapPayment,
  mapRib,
  mapStudentDocument,
  mapStudentProfile,
} from './student-portal.mapper';

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
}
