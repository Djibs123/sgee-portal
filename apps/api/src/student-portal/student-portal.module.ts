import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RibModule } from '../rib/rib.module';
import { ScholarshipModule } from '../scholarship/scholarship.module';
import { StudentDashboardService } from './student-dashboard.service';
import { StudentPortalController } from './student-portal.controller';
import { StudentPortalService } from './student-portal.service';

@Module({
  imports: [AuthModule, PrismaModule, RibModule, ScholarshipModule],
  controllers: [StudentPortalController],
  providers: [StudentPortalService, StudentDashboardService],
})
export class StudentPortalModule {}
