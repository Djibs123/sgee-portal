import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminActor } from '../admin-auth/current-admin.decorator';
import { Roles } from '../admin-auth/roles.decorator';
import { AuditService, type AuditActor } from '../audit/audit.service';
import { sendFileDownload } from '../common/http/file-download';
import {
  ListAuditLogsQueryDto,
  ListStudentsQueryDto,
  OptionalReviewCommentDto,
  RejectDto,
} from './admin.dto';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get('students')
  listStudents(@Query() query: ListStudentsQueryDto) {
    return this.adminService.listStudents(query);
  }

  @Get('audit-logs')
  @Roles('SUPER_ADMIN')
  listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.audit.list(query);
  }

  @Get('documents/pending')
  getPendingDocuments() {
    return this.adminService.getPendingDocuments();
  }

  @Get('documents/:documentId/download')
  async downloadDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() response: Response,
  ) {
    const file = await this.adminService.downloadDocument(documentId);

    return sendFileDownload(response, file);
  }

  @Patch('documents/:documentId/validate')
  validateDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: OptionalReviewCommentDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.adminService.validateDocument(documentId, body, actor);
  }

  @Patch('documents/:documentId/reject')
  rejectDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: RejectDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.adminService.rejectDocument(documentId, body, actor);
  }

  @Get('ribs/pending')
  getPendingRibs() {
    return this.adminService.getPendingRibs();
  }

  @Patch('ribs/:ribId/validate')
  validateRib(
    @Param('ribId', ParseUUIDPipe) ribId: string,
    @Body() body: OptionalReviewCommentDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.adminService.validateRib(ribId, body, actor);
  }

  @Patch('ribs/:ribId/reject')
  rejectRib(
    @Param('ribId', ParseUUIDPipe) ribId: string,
    @Body() body: RejectDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.adminService.rejectRib(ribId, body, actor);
  }
}
