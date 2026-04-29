import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapStudentProfile } from '../student-portal/student-portal.mapper';

export type LoginInput = {
  email?: string;
  password?: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(input: LoginInput) {
    void input;

    return {
      success: true,
      student: await this.getCurrentStudent(),
    };
  }

  logout() {
    return {
      success: true,
    };
  }

  async getCurrentStudentId(): Promise<string> {
    const student = await this.findCurrentStudent();

    return student.id;
  }

  async getCurrentStudent() {
    const student = await this.findCurrentStudent();

    return mapStudentProfile(student);
  }

  private async findCurrentStudent() {
    const student = await this.prisma.student.findFirst({
      where: {
        studentNumber: process.env.DEFAULT_STUDENT_CODE ?? 'STU001',
      },
    });

    if (student) {
      return student;
    }

    const fallbackStudent = await this.prisma.student.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!fallbackStudent) {
      throw new NotFoundException(
        'No student found. Run `pnpm prisma db seed` from apps/api.',
      );
    }

    return fallbackStudent;
  }
}
