import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RibService } from './rib.service';

@Module({
  imports: [PrismaModule],
  providers: [RibService],
  exports: [RibService],
})
export class RibModule {}
