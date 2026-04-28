import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import type { LoginInput } from './auth.service';

const MOCK_SESSION_COOKIE = 'sgee_mock_session';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  @HttpCode(200)
  login(
    @Body() body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.cookie(MOCK_SESSION_COOKIE, 'mock', {
      httpOnly: true,
      sameSite: 'lax',
    });

    return this.authService.login(body);
  }

  @Post('auth/logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(MOCK_SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
    });

    return this.authService.logout();
  }

  @Get('me')
  me() {
    return this.authService.getCurrentStudent();
  }
}
