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
  ApplicantLoginDto,
  EmailDto,
  RegisterApplicantDto,
  TokenDto,
} from './applicant-auth.dto';
import { ApplicantAuthGuard, CurrentApplicant } from './applicant-auth.guard';
import { ApplicantAuthService } from './applicant-auth.service';
import {
  APPLICANT_AUTH_COOKIE_CLEAR_OPTIONS,
  APPLICANT_AUTH_COOKIE_NAME,
  APPLICANT_AUTH_COOKIE_OPTIONS,
  type ApplicantTokenPayload,
} from './applicant-auth.types';

@Controller('applicant')
export class ApplicantAuthController {
  constructor(private readonly applicantAuth: ApplicantAuthService) {}

  @Post('auth/register')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() body: RegisterApplicantDto, @Req() request: Request) {
    return this.applicantAuth.register(body, clientMeta(request));
  }

  @Post('auth/verify-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() body: TokenDto, @Req() request: Request) {
    return this.applicantAuth.verifyEmail(body.token, clientMeta(request));
  }

  @Post('auth/resend-verification')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendVerification(@Body() body: EmailDto) {
    return this.applicantAuth.resendVerification(body.email);
  }

  @Post('auth/login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: ApplicantLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.applicantAuth.login(body, clientMeta(request));

    response.cookie(
      APPLICANT_AUTH_COOKIE_NAME,
      result.token,
      APPLICANT_AUTH_COOKIE_OPTIONS,
    );

    return { success: true, applicant: result.applicant };
  }

  @Post('auth/logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const result = await this.applicantAuth.logout(
      cookies?.[APPLICANT_AUTH_COOKIE_NAME],
    );

    response.clearCookie(
      APPLICANT_AUTH_COOKIE_NAME,
      APPLICANT_AUTH_COOKIE_CLEAR_OPTIONS,
    );

    return result;
  }

  @Get('me')
  @UseGuards(ApplicantAuthGuard)
  me(@CurrentApplicant() applicant: ApplicantTokenPayload) {
    return this.applicantAuth.me(applicant.applicantId);
  }
}
