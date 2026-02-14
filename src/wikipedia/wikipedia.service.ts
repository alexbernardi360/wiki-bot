import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { getUserAgent } from '../common/utils/user-agent';
import { WikiHistory } from './entities/wiki-history.entity';

/** Wikipedia API response structure */
export interface WikiResponse {
  pageid: number;
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

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(WikiHistory)
    private readonly wikiHistoryRepository: Repository<WikiHistory>,
  ) {}

  /** Fetches a random page summary from Wikipedia with deduplication logic. */
  async getRandomPage(traceId?: string | number): Promise<WikiResponse> {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      const startTime = performance.now();
      this.logger.debug(
        `Fetching random page (attempt ${retries + 1}/${maxRetries}) from: ${this.WIKI_API}`,
        { traceId },
      );

      try {
        const { data } = await firstValueFrom(
          this.httpService.get<WikiResponse>(this.WIKI_API, {
            headers: {
              'User-Agent': this.userAgent,
              Accept: 'application/json',
            },
          }),
        );

        // Check if page was already posted
        const exists = await this.wikiHistoryRepository.findOne({
          where: { pageId: data.pageid.toString() },
        });

        if (exists) {
          this.logger.warn(
            `Page "${data.title}" (ID: ${data.pageid}) already exists in history. Retrying...`,
            { traceId, pageid: data.pageid },
          );
          retries++;
          continue;
        }

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

    this.logger.error(
      `Failed to fetch a unique random page after ${maxRetries} attempts`,
      { traceId },
    );
    throw new InternalServerErrorException(
      'Failed to fetch a unique random page from Wikipedia',
    );
  }

  /**
   * Checks if a page is already present in the history.
   */
  async isPageInHistory(pageId: string | number): Promise<boolean> {
    const exists = await this.wikiHistoryRepository.findOne({
      where: { pageId: pageId.toString() },
    });
    return !!exists;
  }

  /** Saves a page to the history database. */
  async saveToHistory(
    pageId: string | number,
    title: string,
    traceId?: string | number,
  ): Promise<void> {
    try {
      await this.wikiHistoryRepository.save({
        pageId: pageId.toString(),
        title,
      });
      this.logger.debug(`Page "${title}" (ID: ${pageId}) saved to history`, {
        traceId,
      });
    } catch (error) {
      this.logger.error(`Error saving page to history: ${error.message}`, {
        traceId,
        pageId,
        title,
      });
      // We don't throw here to avoid breaking the bot flow if history saving fails
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
