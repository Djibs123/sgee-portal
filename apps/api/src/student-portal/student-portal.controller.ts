import { Controller, Get } from '@nestjs/common';
import { StudentPortalService } from './student-portal.service';

@Controller('student')
export class StudentPortalController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Get('profile')
  getProfile() {
    return this.studentPortalService.getProfile();
  }

  @Get('rib')
  getRib() {
    return this.studentPortalService.getRib();
  }

  @Get('cursus')
  getCursus() {
    return this.studentPortalService.getCursus();
  }

  @Get('payments')
  getPayments() {
    return this.studentPortalService.getPayments();
  }

  @Get('documents')
  getDocuments() {
    return this.studentPortalService.getDocuments();
  }
}
