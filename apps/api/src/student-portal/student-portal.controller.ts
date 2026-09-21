import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AuthTokenPayload } from '../auth/auth.types';
import type { AuditActor } from '../audit/audit.service';
import {
  CurrentStudent,
  StudentActor,
} from '../auth/current-student.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { sendFileDownload } from '../common/http/file-download';
import { documentUploadOptions } from '../common/uploads/upload.options';
import { SubmitRibDto } from '../rib/rib.dto';
import { RibService } from '../rib/rib.service';
import { StudentDashboardService } from './student-dashboard.service';
import { UploadDocumentDto } from './student-portal.dto';
import { StudentPortalService } from './student-portal.service';

@Controller('student')
@UseGuards(JwtAuthGuard)
export class StudentPortalController {
  constructor(
    private readonly studentPortalService: StudentPortalService,
    private readonly ribService: RibService,
    private readonly dashboard: StudentDashboardService,
  ) {}

  @Get('dashboard')
  getDashboard(@CurrentStudent() student: AuthTokenPayload) {
    return this.dashboard.getDashboard(student.studentId);
  }

  @Get('profile')
  getProfile(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getProfile(student.studentId);
  }

  @Get('rib')
  getRib(@CurrentStudent() student: AuthTokenPayload) {
    return this.ribService.getForStudent(student.studentId);
  }

  /** Soumet un nouveau RIB : le RIB actif reste utilisé jusqu'à validation. */
  @Patch('rib')
  submitRib(
    @CurrentStudent() student: AuthTokenPayload,
    @StudentActor() actor: AuditActor,
    @Body() body: SubmitRibDto,
  ) {
    return this.ribService.submit(student.studentId, body, actor);
  }

  @Delete('rib/pending')
  cancelPendingRib(
    @CurrentStudent() student: AuthTokenPayload,
    @StudentActor() actor: AuditActor,
  ) {
    return this.ribService.cancelPending(student.studentId, actor);
  }

  @Get('cursus')
  getCursus(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getCursus(student.studentId);
  }

  @Get('payments')
  getPayments(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getPayments(student.studentId);
  }

  @Get('document-types')
  getDocumentTypes() {
    return this.studentPortalService.getDocumentTypes();
  }

  @Get('documents')
  getDocuments(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getDocuments(student.studentId);
  }

  @Get('documents/:documentId/download')
  async downloadDocument(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() response: Response,
  ) {
    const file = await this.studentPortalService.downloadDocument(
      student.studentId,
      documentId,
    );

    return sendFileDownload(response, file);
  }

  @Delete('documents/:documentId/submission')
  cancelDocumentSubmission(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.studentPortalService.cancelDocumentSubmission(
      student.studentId,
      documentId,
    );
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  uploadDocument(
    @CurrentStudent() student: AuthTokenPayload,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.studentPortalService.uploadDocument(
      student.studentId,
      uploadDocumentDto,
      file,
    );
  }
}
