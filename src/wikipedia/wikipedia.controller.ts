import { Controller, Get } from '@nestjs/common';
import { WikipediaService, WikiResponse } from './wikipedia.service';

@Controller('wikipedia')
export class WikipediaController {
  constructor(private readonly wikipediaService: WikipediaService) {}

  @Get('random')
  async getRandom(): Promise<WikiResponse> {
    return await this.wikipediaService.getRandomPage();
  }
}
