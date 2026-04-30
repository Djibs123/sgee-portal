import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { OptionalReviewCommentDto, RejectDto } from './admin.dto';
import { AdminService } from './admin.service';

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

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('documents/pending')
  getPendingDocuments() {
    return this.adminService.getPendingDocuments();
  }

  @Get('documents/:documentId/download')
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const document = await this.adminService.downloadDocument(documentId);

    response.setHeader('Content-Type', document.mimeType);
    response.setHeader(
      'Content-Disposition',
      contentDispositionAttachment(document.originalName),
    );

    return response.sendFile(document.absolutePath);
  }

  @Patch('documents/:documentId/validate')
  validateDocument(
    @Param('documentId') documentId: string,
    @Body() body: OptionalReviewCommentDto,
  ) {
    return this.adminService.validateDocument(documentId, body);
  }

  @Patch('documents/:documentId/reject')
  rejectDocument(
    @Param('documentId') documentId: string,
    @Body() body: RejectDto,
  ) {
    return this.adminService.rejectDocument(documentId, body);
  }

  @Get('ribs/pending')
  getPendingRibs() {
    return this.adminService.getPendingRibs();
  }

  @Patch('ribs/:ribId/validate')
  validateRib(
    @Param('ribId') ribId: string,
    @Body() body: OptionalReviewCommentDto,
  ) {
    return this.adminService.validateRib(ribId, body);
  }

  @Patch('ribs/:ribId/reject')
  rejectRib(@Param('ribId') ribId: string, @Body() body: RejectDto) {
    return this.adminService.rejectRib(ribId, body);
  }
}
