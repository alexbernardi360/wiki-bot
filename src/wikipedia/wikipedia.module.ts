import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WikipediaController } from './wikipedia.controller';
import { WikipediaService } from './wikipedia.service';
import { ImageGeneratorModule } from 'src/image-generator/image-generator.module';

@Module({
  imports: [HttpModule, ImageGeneratorModule],
  controllers: [WikipediaController],
  providers: [WikipediaService],
})
export class WikipediaModule {}
