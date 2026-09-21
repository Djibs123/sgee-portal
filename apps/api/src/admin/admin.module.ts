import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RibModule } from '../rib/rib.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AdminAuthModule, PrismaModule, RibModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
