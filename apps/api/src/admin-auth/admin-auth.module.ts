import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SessionModule } from '../auth/session/session.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ADMIN_JWT_EXPIRES_IN, ADMIN_JWT_SECRET } from './admin-auth.constants';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';

@Module({
  imports: [
    PrismaModule,
    SessionModule,
    JwtModule.register({
      secret: ADMIN_JWT_SECRET,
      signOptions: {
        expiresIn: ADMIN_JWT_EXPIRES_IN,
      },
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthGuard],
  // SessionModule est ré-exporté : tout module qui utilise AdminAuthGuard en a besoin.
  exports: [AdminAuthService, AdminAuthGuard, JwtModule, SessionModule],
})
export class AdminAuthModule {}
