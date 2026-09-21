import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ApplicantAuthController } from './applicant-auth.controller';
import { ApplicantAuthGuard } from './applicant-auth.guard';
import { ApplicantAuthService } from './applicant-auth.service';

/** Réutilise le JwtModule et les sessions de AuthModule (même secret, type APPLICANT). */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ApplicantAuthController],
  providers: [ApplicantAuthService, ApplicantAuthGuard],
  exports: [ApplicantAuthGuard, AuthModule],
})
export class ApplicantAuthModule {}
