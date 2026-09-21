import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { StudentNotificationsController } from '../notifications/student-notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCampaignsController } from './admin-campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { PublicCampaignsController } from './public-campaigns.controller';
import { RequestsService } from './requests.service';
import { StudentRequestsController } from './student-requests.controller';

@Module({
  imports: [PrismaModule, AuthModule, AdminAuthModule],
  controllers: [
    StudentRequestsController,
    StudentNotificationsController,
    AdminCampaignsController,
    PublicCampaignsController,
  ],
  providers: [CampaignsService, RequestsService],
  exports: [CampaignsService, RequestsService],
})
export class ScholarshipModule {}
