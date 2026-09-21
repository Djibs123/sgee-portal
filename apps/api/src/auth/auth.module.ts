import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { JWT_EXPIRES_IN, JWT_SECRET } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    PrismaModule,
    SessionModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: {
        expiresIn: JWT_EXPIRES_IN,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  // SessionModule est ré-exporté : tout module qui utilise JwtAuthGuard en a besoin.
  exports: [AuthService, JwtAuthGuard, JwtModule, SessionModule],
})
export class AuthModule {}
