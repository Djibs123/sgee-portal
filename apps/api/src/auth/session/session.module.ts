import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OneTimeTokenService } from '../tokens/one-time-token.service';
import { SessionService } from './session.service';

@Module({
  imports: [PrismaModule],
  providers: [SessionService, OneTimeTokenService],
  exports: [SessionService, OneTimeTokenService],
})
export class SessionModule {}
