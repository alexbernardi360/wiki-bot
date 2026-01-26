import { Controller, Get, Header, StreamableFile, Query } from '@nestjs/common';
import { WikipediaService } from './wikipedia.service';
import { ImageGeneratorService } from '../image-generator/image-generator.service';
import type { WikiTheme } from '../image-generator/image-generator.service';

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

    // Estraiamo URL e dimensioni (gestendo il caso in cui thumbnail manchi)
    const imgData = data.originalimage;

    const imageBuffer = await this.imageGenerator.generatePostImage({
      title: data.title,
      extract_html: data.extract_html,
      imageUrl: imgData?.source,
      imageWidth: imgData?.width,
      imageHeight: imgData?.height,
      theme: theme,
    });

    return new StreamableFile(imageBuffer);
  }
}
