import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateStudentInput = {
  studentNumber: string;
  fullName: string;
  birthDate: string;
  scholarshipStatus: string;
};

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateStudentInput) {
    const studentNumber = this.requiredString(
      data.studentNumber,
      'studentNumber',
    );
    const fullName = this.requiredString(data.fullName, 'fullName');
    const scholarshipStatus = this.requiredString(
      data.scholarshipStatus,
      'scholarshipStatus',
    );
    const birthDateInput = this.requiredString(data.birthDate, 'birthDate');
    const birthDate = new Date(birthDateInput);

    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException('birthDate must be a valid date string');
    }

    try {
      return await this.prisma.student.create({
        data: {
          studentNumber,
          fullName,
          birthDate,
          scholarshipStatus,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('studentNumber already exists');
      }

      throw error;
    }
  }

  findAll() {
    return this.prisma.student.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByStudentNumber(studentNumber: string) {
    const normalizedStudentNumber = this.requiredString(
      studentNumber,
      'studentNumber',
    );
    const student = await this.prisma.student.findUnique({
      where: {
        studentNumber: normalizedStudentNumber,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  private requiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }
}
