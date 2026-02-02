import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { getUserAgent } from '../common/utils/user-agent';

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
  private readonly userAgent = getUserAgent();

  constructor(private readonly httpService: HttpService) {}

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
   * Cleans text from typical Wikipedia artifacts
   */
  private cleanText(text: string): string {
    if (!text) return '';

    return text.replace(/\s+/g, ' ').trim();
  }

  /** Fetches the summary of a specific Wikipedia page by title. */
  async getPageSummary(title: string): Promise<WikiResponse> {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
      const { data } = await firstValueFrom(
        this.httpService.get<WikiResponse>(url, {
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
      console.error(`Error fetching summary for title "${title}":`, error);
      throw new InternalServerErrorException(
        `Failed to fetch Wikipedia page summary for title: ${title}`,
      );
    }
  }
}
