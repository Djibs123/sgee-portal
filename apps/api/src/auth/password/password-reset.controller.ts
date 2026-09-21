import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn } from 'class-validator';
import type { Request } from 'express';
import {
  EmailDto,
  ResetPasswordDto,
} from '../../applicant-auth/applicant-auth.dto';
import { clientMeta } from '../../common/http/client-meta';
import {
  PasswordResetService,
  type ResettableAccount,
} from './password-reset.service';

export class ForgotPasswordDto extends EmailDto {
  @IsIn(['STUDENT', 'APPLICANT'])
  accountType!: ResettableAccount;
}

@Controller('auth/password')
export class PasswordResetController {
  constructor(private readonly passwordReset: PasswordResetService) {}

  @Post('forgot')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgot(@Body() body: ForgotPasswordDto, @Req() request: Request) {
    return this.passwordReset.requestReset(
      body.email,
      body.accountType,
      clientMeta(request),
    );
  }

  @Post('reset')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  reset(@Body() body: ResetPasswordDto, @Req() request: Request) {
    return this.passwordReset.reset(
      body.token,
      body.password,
      clientMeta(request),
    );
  }
}
