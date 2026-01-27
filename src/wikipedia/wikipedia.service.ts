import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { ConfigService } from '@nestjs/config';
import * as axiosPkg from 'axios/package.json';
import * as pkg from '../../package.json';

/** Wikipedia API response structure */
export interface WikiResponse {
  title: string;
  extract: string;
  extract_html: string;
  originalimage?: { source: string; width: number; height: number };
  thumbnail?: { source: string; width: number; height: number };
}

@Injectable()
export class WikipediaService {
  /** Official Wikipedia API endpoint. */
  private readonly WIKI_API =
    'https://en.wikipedia.org/api/rest_v1/page/random/summary';
  private readonly userAgent: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    const contactEmail =
      configService.get<string>('WIKI_CONTACT_EMAIL') || 'no-email-set';

    this.userAgent = `${pkg.name}/${pkg.version} (${contactEmail}) ${axiosPkg.name}/${axiosPkg.version}`;
  }

  /** Fetches a random page summary from Wikipedia. */
  async getRandomPage(): Promise<WikiResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<WikiResponse>(this.WIKI_API, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
          },
        }),
      );

      return {
        ...data,
        extract: this.cleanText(data.extract),
      };
    } catch (error) {
      console.error('Error fetching data from Wikipedia:', error);

      throw new InternalServerErrorException(
        'Failed to connect to Wikipedia API',
      );
    }
  }

  /**
   * Pulisce il testo da artefatti tipici di Wikipedia
   */
  private cleanText(text: string): string {
    if (!text) return '';

    return text.replace(/\s+/g, ' ').trim();
  }
}
