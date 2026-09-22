import {
  Body,
  type CanActivate,
  Controller,
  createParamDecorator,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  type Type,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import type { Response } from 'express';
import { PaginationQueryDto } from '../admin/admin.dto';
import { ApplicantAuthGuard } from '../applicant-auth/applicant-auth.guard';
import type { AuthenticatedApplicantRequest } from '../applicant-auth/applicant-auth.types';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { sendFileDownload } from '../common/http/file-download';
import { documentUploadOptions } from '../common/uploads/upload.options';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateRequestDto,
  SubmitRequestDto,
  UpdateRequestDto,
  UploadRequestDocumentDto,
} from './dto/request.dto';
import {
  ownerRecipient,
  RequestsService,
  type RequestOwner,
} from './requests.service';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  unreadOnly?: boolean;
}

/** Propriétaire déduit de la session (boursier ou candidat) posée par la garde. */
export const CurrentRequestOwner = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestOwner => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & AuthenticatedApplicantRequest>();

    if (request.applicant) {
      return { kind: 'APPLICANT', id: request.applicant.applicantId };
    }

    if (request.auth) {
      return { kind: 'STUDENT', id: request.auth.studentId };
    }

    throw new UnauthorizedException();
  },
);

/**
 * Mêmes routes pour le renouvellement (boursier, `/api/student`) et la candidature
 * (candidat, `/api/applicant`) : seuls le préfixe et la garde changent.
 */
function createOwnerRequestsController(
  path: string,
  guard: Type<CanActivate>,
  name: string,
) {
  @Controller(path)
  @UseGuards(guard)
  class OwnerRequestsController {
    constructor(
      readonly requests: RequestsService,
      readonly notifications: NotificationsService,
    ) {}

    @Get('campaigns/current')
    currentCampaign(@CurrentRequestOwner() owner: RequestOwner) {
      return this.requests.currentCampaign(owner);
    }

    @Get('requests')
    list(@CurrentRequestOwner() owner: RequestOwner) {
      return this.requests.listForOwner(owner);
    }

    @Post('requests')
    create(
      @CurrentRequestOwner() owner: RequestOwner,
      @Body() body: CreateRequestDto,
      @Ip() ip: string,
    ) {
      return this.requests.create(owner, body.campaignId, ip);
    }

    @Get('requests/:requestId')
    get(
      @CurrentRequestOwner() owner: RequestOwner,
      @Param('requestId', ParseUUIDPipe) requestId: string,
    ) {
      return this.requests.getForOwner(owner, requestId);
    }

    /** Sauvegarde du brouillon ou du complément demandé. */
    @Patch('requests/:requestId')
    update(
      @CurrentRequestOwner() owner: RequestOwner,
      @Param('requestId', ParseUUIDPipe) requestId: string,
      @Body() body: UpdateRequestDto,
    ) {
      return this.requests.update(owner, requestId, body);
    }

    @Post('requests/:requestId/submit')
    @HttpCode(200)
    submit(
      @CurrentRequestOwner() owner: RequestOwner,
      @Param('requestId', ParseUUIDPipe) requestId: string,
      @Body() _body: SubmitRequestDto,
      @Ip() ip: string,
    ) {
      return this.requests.submit(owner, requestId, ip);
    }

    @Post('requests/:requestId/withdraw')
    @HttpCode(200)
    withdraw(
      @CurrentRequestOwner() owner: RequestOwner,
      @Param('requestId', ParseUUIDPipe) requestId: string,
      @Ip() ip: string,
    ) {
      return this.requests.withdraw(owner, requestId, ip);
    }

    @Post('requests/:requestId/documents')
    @UseInterceptors(FileInterceptor('file', documentUploadOptions))
    uploadDocument(
      @CurrentRequestOwner() owner: RequestOwner,
      @Param('requestId', ParseUUIDPipe) requestId: string,
      @Body() body: UploadRequestDocumentDto,
      @UploadedFile() file?: Express.Multer.File,
    ) {
      return this.requests.uploadDocument(
        owner,
        requestId,
        body.documentTypeCode,
        file,
      );
    }

    @Delete('requests/:requestId/documents/:documentId')
    removeDocument(
      @CurrentRequestOwner() owner: RequestOwner,
      @Param('requestId', ParseUUIDPipe) requestId: string,
      @Param('documentId', ParseUUIDPipe) documentId: string,
    ) {
      return this.requests.removeDocument(owner, requestId, documentId);
    }

    @Get('requests/:requestId/documents/:documentId/download')
    async downloadDocument(
      @CurrentRequestOwner() owner: RequestOwner,
      @Param('requestId', ParseUUIDPipe) requestId: string,
      @Param('documentId', ParseUUIDPipe) documentId: string,
      @Res() response: Response,
    ) {
      const file = await this.requests.downloadDocument(
        owner,
        requestId,
        documentId,
      );

      return sendFileDownload(response, file);
    }

    @Get('notifications')
    listNotifications(
      @CurrentRequestOwner() owner: RequestOwner,
      @Query() query: ListNotificationsQueryDto,
    ) {
      return this.notifications.list(ownerRecipient(owner), query);
    }

    @Patch('notifications/:notificationId/read')
    markNotificationRead(
      @CurrentRequestOwner() owner: RequestOwner,
      @Param('notificationId', ParseUUIDPipe) notificationId: string,
    ) {
      return this.notifications.markRead(ownerRecipient(owner), notificationId);
    }

    @Post('notifications/read-all')
    @HttpCode(200)
    markAllNotificationsRead(@CurrentRequestOwner() owner: RequestOwner) {
      return this.notifications.markAllRead(ownerRecipient(owner));
    }
  }

  Object.defineProperty(OwnerRequestsController, 'name', { value: name });

  return OwnerRequestsController;
}

export const StudentRequestsController = createOwnerRequestsController(
  'student',
  JwtAuthGuard,
  'StudentRequestsController',
);

export const ApplicantRequestsController = createOwnerRequestsController(
  'applicant',
  ApplicantAuthGuard,
  'ApplicantRequestsController',
);
