import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { ApplicantAuthModule } from '../applicant-auth/applicant-auth.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCampaignsController } from './admin-campaigns.controller';
import { AdminRequestsController } from './admin-requests.controller';
import { CampaignsService } from './campaigns.service';
import {
  ApplicantRequestsController,
  StudentRequestsController,
} from './owner-requests.controller';
import { PublicCampaignsController } from './public-campaigns.controller';
import { RequestsService } from './requests.service';
import { ReviewService } from './review.service';

@Module({
  imports: [PrismaModule, AuthModule, AdminAuthModule, ApplicantAuthModule],
  controllers: [
    StudentRequestsController,
    ApplicantRequestsController,
    AdminRequestsController,
    AdminCampaignsController,
    PublicCampaignsController,
  ],
  providers: [CampaignsService, RequestsService, ReviewService],
  exports: [CampaignsService, RequestsService],
})
export class ScholarshipModule {}
