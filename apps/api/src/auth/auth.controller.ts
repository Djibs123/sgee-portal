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
  AUTH_COOKIE_CLEAR_OPTIONS,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from './auth.constants';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';
import type { AuthTokenPayload } from './auth.types';
import { CurrentStudent } from './current-student.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body, clientMeta(request));

    response.cookie(AUTH_COOKIE_NAME, result.token, AUTH_COOKIE_OPTIONS);

    return {
      success: result.success,
      student: result.student,
    };
  }

  @Post('auth/logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const result = await this.authService.logout(
      cookies?.[AUTH_COOKIE_NAME],
      clientMeta(request),
    );

    response.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentStudent() student: AuthTokenPayload) {
    return this.authService.getCurrentStudent(student.studentId);
  }
}
