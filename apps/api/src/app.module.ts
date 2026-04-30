import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StudentPortalModule } from './student-portal/student-portal.module';
import { StudentsModule } from './students/students.module';

@Module({
  imports: [AdminModule, AuthModule, StudentPortalModule, StudentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
