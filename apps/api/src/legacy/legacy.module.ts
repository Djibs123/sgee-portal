import { Module } from '@nestjs/common';
import { LegacyService } from './legacy.service';

@Module({
  providers: [LegacyService],
  exports: [LegacyService],
})
export class LegacyModule {}
