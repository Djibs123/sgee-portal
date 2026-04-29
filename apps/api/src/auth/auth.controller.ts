import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from './auth.constants';
import { CurrentStudent } from './current-student.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import type { LoginInput } from './auth.service';
import type { AuthTokenPayload } from './auth.types';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  @HttpCode(200)
  async login(
    @Body() body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body);

    response.cookie(AUTH_COOKIE_NAME, result.token, AUTH_COOKIE_OPTIONS);

    return {
      success: result.success,
      student: result.student,
    };
  }

  @Post('auth/logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(AUTH_COOKIE_NAME, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: undefined,
    });

    return this.authService.logout();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentStudent() student: AuthTokenPayload) {
    return this.authService.getCurrentStudent(student.studentId);
  }
}
