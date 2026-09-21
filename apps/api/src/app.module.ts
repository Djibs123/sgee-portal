import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AdminModule } from './admin/admin.module';
import { ApplicantAuthModule } from './applicant-auth/applicant-auth.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { loggerConfig } from './common/logging/logger.config';
import { CsrfGuard } from './common/security/csrf.guard';
import { UploadsModule } from './common/uploads/uploads.module';
import { HealthController } from './health/health.controller';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScholarshipModule } from './scholarship/scholarship.module';
import { StudentPortalModule } from './student-portal/student-portal.module';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),
    // Quota global par IP ; les routes de connexion appliquent un quota plus strict.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuditModule,
    UploadsModule,
    NotificationsModule,
    MailModule,
    AdminModule,
    AuthModule,
    StudentPortalModule,
    ScholarshipModule,
    ApplicantAuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
