import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import type { WikiTheme } from '../image-generator/image-generator.service';
import { ImageGeneratorService } from '../image-generator/image-generator.service';
import { WikipediaService } from './wikipedia.service';

@Controller('wikipedia')
export class WikipediaController {
  constructor(
    private readonly wikipediaService: WikipediaService,
    private readonly imageGenerator: ImageGeneratorService,
  ) {}

  @Get('random')
  async getRandom() {
    return await this.wikipediaService.getRandomPage();
  }

  @Get('random/image-preview')
  @Header('Content-Type', 'image/png')
  @Header('Content-Disposition', 'inline')
  async getImagePreview(
    @Query('theme') theme: WikiTheme,
  ): Promise<StreamableFile> {
    const data = await this.wikipediaService.getRandomPage();

    const imageBuffer = await this.imageGenerator.generatePostImage({
      title: data.title,
      extract_html: data.extract_html,
      theme: theme,
    });

    return new StreamableFile(imageBuffer);
  }
}
