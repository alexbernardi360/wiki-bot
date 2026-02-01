import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageGeneratorService } from './image-generator.service';

@Module({
  imports: [ConfigModule],
  providers: [ImageGeneratorService],
  exports: [ImageGeneratorService],
})
export class ImageGeneratorModule {}
