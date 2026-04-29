import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
