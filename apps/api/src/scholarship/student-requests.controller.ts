import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
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
import { CurrentStudent } from '../auth/current-student.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { sendFileDownload } from '../common/http/file-download';
import { documentUploadOptions } from '../common/uploads/upload.options';
import {
  CreateRequestDto,
  SubmitRequestDto,
  UpdateRequestDto,
  UploadRequestDocumentDto,
} from './dto/request.dto';
import { RequestsService, type RequestOwner } from './requests.service';

const ownerOf = (student: AuthTokenPayload): RequestOwner => ({
  kind: 'STUDENT',
  id: student.studentId,
});

/** Renouvellement annuel de la bourse, côté boursier. */
@Controller('student')
@UseGuards(JwtAuthGuard)
export class StudentRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('campaigns/current')
  currentCampaign(@CurrentStudent() student: AuthTokenPayload) {
    return this.requests.currentCampaign(ownerOf(student));
  }

  @Get('requests')
  list(@CurrentStudent() student: AuthTokenPayload) {
    return this.requests.listForOwner(ownerOf(student));
  }

  @Post('requests')
  create(
    @CurrentStudent() student: AuthTokenPayload,
    @Body() body: CreateRequestDto,
    @Ip() ip: string,
  ) {
    return this.requests.create(ownerOf(student), body.campaignId, ip);
  }

  @Get('requests/:requestId')
  get(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.requests.getForOwner(ownerOf(student), requestId);
  }

  /** Sauvegarde du brouillon (ou du complément demandé). */
  @Patch('requests/:requestId')
  update(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: UpdateRequestDto,
  ) {
    return this.requests.update(ownerOf(student), requestId, body);
  }

  @Post('requests/:requestId/submit')
  @HttpCode(200)
  submit(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() _body: SubmitRequestDto,
    @Ip() ip: string,
  ) {
    return this.requests.submit(ownerOf(student), requestId, ip);
  }

  @Post('requests/:requestId/withdraw')
  @HttpCode(200)
  withdraw(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Ip() ip: string,
  ) {
    return this.requests.withdraw(ownerOf(student), requestId, ip);
  }

  @Post('requests/:requestId/documents')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  uploadDocument(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: UploadRequestDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.requests.uploadDocument(
      ownerOf(student),
      requestId,
      body.documentTypeCode,
      file,
    );
  }

  @Delete('requests/:requestId/documents/:documentId')
  removeDocument(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.requests.removeDocument(
      ownerOf(student),
      requestId,
      documentId,
    );
  }

  @Get('requests/:requestId/documents/:documentId/download')
  async downloadDocument(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() response: Response,
  ) {
    const file = await this.requests.downloadDocument(
      ownerOf(student),
      requestId,
      documentId,
    );

    return sendFileDownload(response, file);
  }
}
