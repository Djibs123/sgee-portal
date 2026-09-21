import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { clientMeta } from '../common/http/client-meta';
import {
  ADMIN_AUTH_COOKIE_CLEAR_OPTIONS,
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_AUTH_COOKIE_OPTIONS,
} from './admin-auth.constants';
import { AdminLoginDto } from './admin-auth.dto';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import type { AdminAuthTokenPayload } from './admin-auth.types';
import { CurrentAdmin } from './current-admin.decorator';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('auth/login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() body: AdminLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.adminAuthService.login(body, clientMeta(request));

    response.cookie(
      ADMIN_AUTH_COOKIE_NAME,
      result.token,
      ADMIN_AUTH_COOKIE_OPTIONS,
    );

    return {
      success: result.success,
      admin: result.admin,
    };
  }

  @Post('auth/logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const result = await this.adminAuthService.logout(
      cookies?.[ADMIN_AUTH_COOKIE_NAME],
      clientMeta(request),
    );

    response.clearCookie(
      ADMIN_AUTH_COOKIE_NAME,
      ADMIN_AUTH_COOKIE_CLEAR_OPTIONS,
    );

    return result;
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@CurrentAdmin() admin: AdminAuthTokenPayload) {
    return this.adminAuthService.getCurrentAdmin(admin.adminId);
  }
}
