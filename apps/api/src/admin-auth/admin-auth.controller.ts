import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  ADMIN_AUTH_COOKIE_CLEAR_OPTIONS,
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_AUTH_COOKIE_OPTIONS,
} from './admin-auth.constants';
import { AdminLoginDto } from './admin-auth.dto';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { CurrentAdmin } from './current-admin.decorator';
import type { AdminAuthTokenPayload } from './admin-auth.types';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('auth/login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() body: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.adminAuthService.login(body);

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
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(
      ADMIN_AUTH_COOKIE_NAME,
      ADMIN_AUTH_COOKIE_CLEAR_OPTIONS,
    );

    return this.adminAuthService.logout();
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@CurrentAdmin() admin: AdminAuthTokenPayload) {
    return this.adminAuthService.getCurrentAdmin(admin.adminId);
  }
}
