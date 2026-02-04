import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
  private readonly logger = new Logger(WikipediaService.name);

  /** Official Wikipedia API endpoint. */
  private readonly WIKI_API =
    'https://en.wikipedia.org/api/rest_v1/page/random/summary';
  private readonly userAgent = getUserAgent();

  constructor(private readonly httpService: HttpService) {}

  /** Fetches a random page summary from Wikipedia. */
  async getRandomPage(traceId?: string | number): Promise<WikiResponse> {
    const startTime = performance.now();
    this.logger.debug(`Fetching random page from: ${this.WIKI_API}`, {
      traceId,
    });
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<WikiResponse>(this.WIKI_API, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
          },
        }),
      );

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      this.logger.debug(
        `Random page "${data.title}" fetched in ${durationMs}ms`,
        {
          traceId,
          durationMs,
        },
      );

      return {
        ...data,
        extract: this.cleanText(data.extract),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching data from Wikipedia: ${error.message}`,
        {
          traceId,
          stack: error.stack,
        },
      );

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
  async getPageSummary(
    title: string,
    traceId?: string | number,
  ): Promise<WikiResponse> {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
    const startTime = performance.now();
    this.logger.debug(`Fetching page summary for "${title}" from: ${url}`, {
      traceId,
    });
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<WikiResponse>(url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
          },
        }),
      );

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      this.logger.debug(
        `Page summary for "${title}" fetched in ${durationMs}ms`,
        {
          traceId,
          durationMs,
        },
      );

      return {
        ...data,
        extract: this.cleanText(data.extract),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching summary for title "${title}": ${error.message}`,
        { traceId, stack: error.stack },
      );
      throw new InternalServerErrorException(
        `Failed to fetch Wikipedia page summary for title: ${title}`,
      );
    }
  }
}
