import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN_JWT_EXPIRES_IN } from './admin-auth.constants';
import type { AdminLoginDto } from './admin-auth.dto';
import type { AdminAuthTokenPayload } from './admin-auth.types';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: AdminLoginDto) {
    const email = input.email.trim().toLowerCase();
    const admin = await this.prisma.adminUser.findUnique({
      where: {
        email,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Identifiants admin invalides');
    }

    const passwordMatches = await bcrypt.compare(
      input.password,
      admin.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants admin invalides');
    }

    const updatedAdmin = await this.prisma.adminUser.update({
      where: {
        id: admin.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
    const payload: AdminAuthTokenPayload = {
      sub: updatedAdmin.id,
      adminId: updatedAdmin.id,
      email: updatedAdmin.email,
      role: updatedAdmin.role,
    };

    return {
      success: true,
      token: await this.jwtService.signAsync(payload, {
        expiresIn: ADMIN_JWT_EXPIRES_IN,
      }),
      admin: this.mapAdmin(updatedAdmin),
    };
  }

  logout() {
    return {
      success: true,
    };
  }

  async getCurrentAdmin(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: {
        id: adminId,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Session admin invalide ou expiree');
    }

    return this.mapAdmin(admin);
  }

  private mapAdmin(admin: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
    lastLoginAt: Date | null;
  }) {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    };
  }
}
