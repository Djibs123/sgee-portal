import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentStudent } from '../auth/current-student.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthTokenPayload } from '../auth/auth.types';
import { UpdateRibDto, UploadDocumentDto } from './student-portal.dto';
import { StudentPortalService } from './student-portal.service';
import {
  MAX_UPLOAD_SIZE_BYTES,
  studentDocumentFileFilter,
  studentDocumentStorage,
} from './upload.config';

function toAsciiFilename(filename: string) {
  const normalized = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/["\\]/g, '')
    .trim();

  return normalized || 'document';
}

function encodeRfc5987Value(value: string) {
  return encodeURIComponent(value)
    .replace(
      /['()]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    .replace(/\*/g, '%2A');
}

function contentDispositionAttachment(filename: string) {
  return `attachment; filename="${toAsciiFilename(filename)}"; filename*=UTF-8''${encodeRfc5987Value(filename)}`;
}

@Controller('student')
@UseGuards(JwtAuthGuard)
export class StudentPortalController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Get('profile')
  getProfile(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getProfile(student.studentId);
  }

  @Get('rib')
  getRib(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getRib(student.studentId);
  }

  @Patch('rib')
  updateRib(
    @CurrentStudent() student: AuthTokenPayload,
    @Body() updateRibDto: UpdateRibDto,
  ) {
    return this.studentPortalService.updateRib(student.studentId, updateRibDto);
  }

  @Get('cursus')
  getCursus(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getCursus(student.studentId);
  }

  @Get('payments')
  getPayments(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getPayments(student.studentId);
  }

  @Get('documents')
  getDocuments(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getDocuments(student.studentId);
  }

  @Get('documents/:documentId/download')
  async downloadDocument(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const document = await this.studentPortalService.downloadDocument(
      student.studentId,
      documentId,
    );

    response.setHeader('Content-Type', document.mimeType);
    response.setHeader(
      'Content-Disposition',
      contentDispositionAttachment(document.originalName),
    );

    return response.sendFile(document.absolutePath);
  }

  @Delete('documents/:documentId/submission')
  cancelDocumentSubmission(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('documentId') documentId: string,
  ) {
    return this.studentPortalService.cancelDocumentSubmission(
      student.studentId,
      documentId,
    );
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: studentDocumentStorage,
      fileFilter: studentDocumentFileFilter,
      limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES,
      },
    }),
  )
  uploadDocument(
    @CurrentStudent() student: AuthTokenPayload,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    return this.studentPortalService.uploadDocument(
      student.studentId,
      uploadDocumentDto,
      file,
    );
  }
}
