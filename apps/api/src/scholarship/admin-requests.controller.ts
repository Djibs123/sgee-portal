import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminActor } from '../admin-auth/current-admin.decorator';
import type { AuditActor } from '../audit/audit.service';
import { sendFileDownload } from '../common/http/file-download';
import {
  ListRequestsQueryDto,
  OptionalCommentDto,
  RequestInfoDto,
  RequiredCommentDto,
} from './dto/review.dto';
import { ReviewService } from './review.service';

/** File d'instruction des renouvellements et candidatures (tout agent). */
@Controller('admin/requests')
@UseGuards(AdminAuthGuard)
export class AdminRequestsController {
  constructor(private readonly review: ReviewService) {}

  @Get()
  list(@Query() query: ListRequestsQueryDto) {
    return this.review.list(query);
  }

  @Get(':requestId')
  detail(@Param('requestId', ParseUUIDPipe) requestId: string) {
    return this.review.detail(requestId);
  }

  @Get(':requestId/documents/:documentId/download')
  async download(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() response: Response,
  ) {
    return sendFileDownload(
      response,
      await this.review.downloadDocument(requestId, documentId),
    );
  }

  @Post(':requestId/start-review')
  @HttpCode(200)
  startReview(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: OptionalCommentDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.review.startReview(requestId, actor, body.comment);
  }

  @Post(':requestId/request-info')
  @HttpCode(200)
  requestInfo(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: RequestInfoDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.review.requestInfo(requestId, body, actor);
  }

  @Post(':requestId/approve')
  @HttpCode(200)
  approve(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: OptionalCommentDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.review.approve(requestId, actor, body.comment);
  }

  @Post(':requestId/reject')
  @HttpCode(200)
  reject(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: RequiredCommentDto,
    @AdminActor() actor: AuditActor,
  ) {
    return this.review.reject(requestId, actor, body.comment);
  }
}
