import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LegacyModule } from '../legacy/legacy.module';
import { StudentPortalController } from './student-portal.controller';
import { StudentPortalService } from './student-portal.service';

@Module({
  imports: [AuthModule, LegacyModule],
  controllers: [StudentPortalController],
  providers: [StudentPortalService],
})
export class StudentPortalModule {}
