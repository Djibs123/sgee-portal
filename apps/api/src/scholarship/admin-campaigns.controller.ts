import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminActor } from '../admin-auth/current-admin.decorator';
import { Roles } from '../admin-auth/roles.decorator';
import type { AuditActor } from '../audit/audit.service';
import { CampaignsService } from './campaigns.service';
import {
  AcademicYearDto,
  CreateCampaignDto,
  UpdateAcademicYearDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';

/** Consultation par tout instructeur ; création et modification réservées aux super-admins. */
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminCampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get('campaigns')
  list() {
    return this.campaigns.listForAdmin();
  }

  @Post('campaigns')
  @Roles('SUPER_ADMIN')
  create(@Body() body: CreateCampaignDto, @AdminActor() actor: AuditActor) {
    return this.campaigns.create(body, actor);
  }

  @Patch('campaigns/:campaignId')
  @Roles('SUPER_ADMIN')
  update(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() body: UpdateCampaignDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.campaigns.update(campaignId, body, actor);
  }

  @Post('campaigns/:campaignId/close')
  @HttpCode(200)
  @Roles('SUPER_ADMIN')
  close(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @AdminActor() actor: AuditActor,
  ) {
    return this.campaigns.close(campaignId, actor);
  }

  @Get('academic-years')
  listAcademicYears() {
    return this.campaigns.listAcademicYears();
  }

  @Post('academic-years')
  @Roles('SUPER_ADMIN')
  createAcademicYear(
    @Body() body: AcademicYearDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.campaigns.createAcademicYear(body, actor);
  }

  @Patch('academic-years/:yearId')
  @Roles('SUPER_ADMIN')
  updateAcademicYear(
    @Param('yearId', ParseUUIDPipe) yearId: string,
    @Body() body: UpdateAcademicYearDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.campaigns.updateAcademicYear(yearId, body, actor);
  }
}
