import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { mapStudentProfile } from '../student-portal/student-portal.mapper';
import { JWT_EXPIRES_IN } from './auth.constants';
import type { AuthTokenPayload } from './auth.types';

export type LoginInput = {
  identifier?: string;
  email?: string;
  password?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: LoginInput) {
    const identifier = this.getIdentifier(input);
    const password = this.getPassword(input);
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [{ email: identifier }, { studentNumber: identifier }],
      },
    });

    if (!student?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      password,
      student.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updatedStudent = await this.prisma.student.update({
      where: {
        id: student.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
    const payload: AuthTokenPayload = {
      sub: updatedStudent.id,
      studentId: updatedStudent.id,
      codeEtudiant: updatedStudent.studentNumber,
    };

    return {
      success: true,
      token: await this.jwtService.signAsync(payload, {
        expiresIn: JWT_EXPIRES_IN,
      }),
      student: mapStudentProfile(updatedStudent),
    };
  }

  logout() {
    return {
      success: true,
    };
  }

  async getCurrentStudent(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: {
        id: studentId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return mapStudentProfile(student);
  }

  private getIdentifier(input: LoginInput) {
    const identifier = input.identifier ?? input.email;

    if (typeof identifier !== 'string' || identifier.trim() === '') {
      throw new BadRequestException('identifier is required');
    }

    return identifier.trim();
  }

  private getPassword(input: LoginInput) {
    if (typeof input.password !== 'string' || input.password === '') {
      throw new BadRequestException('password is required');
    }

    return input.password;
  }
}
