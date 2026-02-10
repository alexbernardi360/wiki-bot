import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageGeneratorModule } from '../image-generator/image-generator.module';
import { WikiHistory } from './entities/wiki-history.entity';
import { WikipediaController } from './wikipedia.controller';
import { WikipediaService } from './wikipedia.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([WikiHistory]),
    ImageGeneratorModule,
  ],
  controllers: [WikipediaController],
  providers: [WikipediaService],
  exports: [WikipediaService],
})
export class WikipediaModule {}
