import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { LegacyService } from '../legacy/legacy.service';

@Injectable()
export class StudentPortalService {
  constructor(
    private readonly authService: AuthService,
    private readonly legacyService: LegacyService,
  ) {}

  async getRib() {
    const student = await this.authService.getCurrentStudent();
    return this.legacyService.getStudentRib(student);
  }

  async getCursus() {
    const student = await this.authService.getCurrentStudent();
    return this.legacyService.getStudentCursus(student);
  }

  async getPayments() {
    const student = await this.authService.getCurrentStudent();
    return this.legacyService.getStudentPayments(student);
  }

  async getDocuments() {
    const student = await this.authService.getCurrentStudent();
    return this.legacyService.getStudentDocuments(student);
  }
}
