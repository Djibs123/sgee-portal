import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentStudent } from '../auth/current-student.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthTokenPayload } from '../auth/auth.types';
import { StudentPortalService } from './student-portal.service';

@Controller('student')
@UseGuards(JwtAuthGuard)
export class StudentPortalController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Get('profile')
  getProfile(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getProfile(student.studentId);
  }

  @Get('rib')
  getRib(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getRib(student.studentId);
  }

  @Get('cursus')
  getCursus(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getCursus(student.studentId);
  }

  @Get('payments')
  getPayments(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getPayments(student.studentId);
  }

  @Get('documents')
  getDocuments(@CurrentStudent() student: AuthTokenPayload) {
    return this.studentPortalService.getDocuments(student.studentId);
  }
}
