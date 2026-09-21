import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../admin/admin.dto';
import type { AuthTokenPayload } from '../auth/auth.types';
import { CurrentStudent } from '../auth/current-student.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  unreadOnly?: boolean;
}

@Controller('student/notifications')
@UseGuards(JwtAuthGuard)
export class StudentNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentStudent() student: AuthTokenPayload,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.list({ studentId: student.studentId }, query);
  }

  @Patch(':notificationId/read')
  markRead(
    @CurrentStudent() student: AuthTokenPayload,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notifications.markRead(
      { studentId: student.studentId },
      notificationId,
    );
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentStudent() student: AuthTokenPayload) {
    return this.notifications.markAllRead({ studentId: student.studentId });
  }
}
