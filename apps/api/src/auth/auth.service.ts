import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuthenticatedStudent = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  scholarshipStatus: string;
};

export type LoginInput = {
  email?: string;
  password?: string;
};

@Injectable()
export class AuthService {
  private readonly fallbackStudent: AuthenticatedStudent = {
    id: 'mock-student-id',
    studentNumber: 'STU-MOCK-001',
    firstName: 'Etudiant',
    lastName: 'SGEE',
    fullName: 'Etudiant SGEE',
    email: 'student@example.com',
    scholarshipStatus: 'PENDING',
  };

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

  async getCurrentStudent(): Promise<AuthenticatedStudent> {
    const student = await this.prisma.student.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!student) {
      return this.fallbackStudent;
    }

    return {
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`,
      email: student.email,
      scholarshipStatus: student.scholarshipStatus,
    };
  }
}
