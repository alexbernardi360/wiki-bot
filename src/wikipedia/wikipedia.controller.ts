import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import { ImageGeneratorService } from 'src/image-generator/image-generator.service';
import { WikipediaService, WikiResponse } from './wikipedia.service';

@Controller('wikipedia')
export class WikipediaController {
  constructor(
    private readonly wikipediaService: WikipediaService,
    private readonly imageGenerator: ImageGeneratorService,
  ) {}

  @Get('random')
  async getRandom(): Promise<WikiResponse> {
    return await this.wikipediaService.getRandomPage();
  }

  @Get('random/image-preview')
  @Header('Content-Type', 'image/png') // Dice al browser: "Questa è un'immagine"
  @Header('Content-Disposition', 'inline') // Dice al browser: "Mostrala, non scaricarla"
  async getImagePreview(): Promise<StreamableFile> {
    const data = await this.wikipediaService.getRandomPage();

    const imageBuffer = await this.imageGenerator.generatePostImage({
      title: data.title,
      extract_html: data.extract_html,
    });

    // 3. Ritorniamo il file come stream
    return new StreamableFile(imageBuffer);
  }
}
