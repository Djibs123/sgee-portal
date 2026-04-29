import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { mapStudentProfile } from '../student-portal/student-portal.mapper';
import { JWT_EXPIRES_IN } from './auth.constants';
import type { LoginDto } from './auth.dto';
import type { AuthTokenPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: LoginDto) {
    const identifier = input.identifier.trim();
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [{ email: identifier }, { studentNumber: identifier }],
      },
    });

    if (!student?.passwordHash) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordMatches = await bcrypt.compare(
      input.password,
      student.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides');
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
      throw new UnauthorizedException('Session invalide ou expiree');
    }

    return mapStudentProfile(student);
  }
}
