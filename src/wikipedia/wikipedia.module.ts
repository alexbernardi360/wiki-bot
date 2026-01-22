import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WikipediaController } from './wikipedia.controller';
import { WikipediaService } from './wikipedia.service';

@Module({
  imports: [HttpModule],
  controllers: [WikipediaController],
  providers: [WikipediaService],
})
export class WikipediaModule {}
