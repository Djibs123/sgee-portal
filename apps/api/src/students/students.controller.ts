import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StudentsService } from './students.service';

type CreateStudentBody = {
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  scholarshipStatus: string;
};

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() body: CreateStudentBody) {
    return this.studentsService.create(body);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  // Legacy debug route. Portal endpoints must use /api/me and /api/student/*.
  @Get(':studentNumber')
  findByStudentNumber(@Param('studentNumber') studentNumber: string) {
    return this.studentsService.findByStudentNumber(studentNumber);
  }
}
