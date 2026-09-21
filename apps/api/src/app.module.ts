import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './common/security/csrf.guard';
import { UploadsModule } from './common/uploads/uploads.module';
import { StudentPortalModule } from './student-portal/student-portal.module';

@Module({
  imports: [
    // Quota global par IP ; les routes de connexion appliquent un quota plus strict.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    AuditModule,
    UploadsModule,
    AdminModule,
    AuthModule,
    StudentPortalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
