import { Module } from '@nestjs/common';
import { SystemInfoService } from './system-info.service';

@Module({
  providers: [SystemInfoService],
  exports: [SystemInfoService],
})
export class SystemInfoModule {}
