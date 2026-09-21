import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RibModule } from '../rib/rib.module';
import { StudentPortalController } from './student-portal.controller';
import { StudentPortalService } from './student-portal.service';

@Module({
  imports: [AuthModule, PrismaModule, RibModule],
  controllers: [StudentPortalController],
  providers: [StudentPortalService],
})
export class StudentPortalModule {}
