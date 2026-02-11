import { HttpService } from '@nestjs/axios';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of, throwError } from 'rxjs';
import { Repository } from 'typeorm';
import { WikiHistory } from './entities/wiki-history.entity';
import { WikipediaService, WikiResponse } from './wikipedia.service';

describe('WikipediaService', () => {
  let service: WikipediaService;
  let httpService: HttpService;
  let wikiHistoryRepository: Repository<WikiHistory>;

  const mockWikiResponse: WikiResponse = {
    pageid: 12345,
    title: 'Test Page',
    extract: 'This is a test extract.',
    extract_html: '<p>This is a test extract.</p>',
    originalimage: {
      source: 'https://example.com/image.jpg',
      width: 100,
      height: 100,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WikipediaService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WikiHistory),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WikipediaService>(WikipediaService);
    httpService = module.get<HttpService>(HttpService);
    wikiHistoryRepository = module.get<Repository<WikiHistory>>(
      getRepositoryToken(WikiHistory),
    );

    // Suppress logs during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRandomPage', () => {
    it('should return a random page summary on success', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: mockWikiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );
      jest.spyOn(wikiHistoryRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getRandomPage('test-trace-id');

      expect(result).toEqual(mockWikiResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://en.wikipedia.org/api/rest_v1/page/random/summary',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
            Accept: 'application/json',
          }),
        }),
      );
    });

    it('should throw InternalServerErrorException if the API call fails', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => new Error('API Error')));

      await expect(service.getRandomPage('test-trace-id')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should retry if the page already exists in history', async () => {
      const existingResponse = {
        ...mockWikiResponse,
        pageid: 111,
        title: 'Old',
      };
      const newResponse = { ...mockWikiResponse, pageid: 222, title: 'New' };

      const getSpy = jest.spyOn(httpService, 'get');
      getSpy
        .mockReturnValueOnce(
          of({
            data: existingResponse,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
          }),
        )
        .mockReturnValueOnce(
          of({
            data: newResponse,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
          }),
        );

      const findOneSpy = jest.spyOn(wikiHistoryRepository, 'findOne');
      findOneSpy
        .mockResolvedValueOnce({ id: 1, pageId: '111', title: 'Old' } as any)
        .mockResolvedValueOnce(null);

      const result = await service.getRandomPage();

      expect(result.pageid).toBe(222);
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(findOneSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw InternalServerErrorException if max retries reached', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: mockWikiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );
      jest
        .spyOn(wikiHistoryRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as any);

      await expect(service.getRandomPage()).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(httpService.get).toHaveBeenCalledTimes(5);
    });

    it('should clean the extract text', async () => {
      const responseWithMessyText = {
        ...mockWikiResponse,
        extract: '  This   is  messy  text.  ',
      };
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: responseWithMessyText,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );
      jest.spyOn(wikiHistoryRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getRandomPage();
      expect(result.extract).toBe('This is messy text.');
    });
  });

  describe('getPageSummary', () => {
    it('should return a page summary by title on success', async () => {
      const title = 'Test_Page';
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: mockWikiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      const result = await service.getPageSummary(title, 'test-trace-id');

      expect(result).toEqual(mockWikiResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
        expect.any(Object),
      );
    });

    it('should throw InternalServerErrorException if the API call fails', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => new Error('API Error')));

      await expect(
        service.getPageSummary('Invalid_Page', 'test-trace-id'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('saveToHistory', () => {
    it('should save page to history', async () => {
      const saveSpy = jest
        .spyOn(wikiHistoryRepository, 'save')
        .mockResolvedValue({} as any);

      await service.saveToHistory(123, 'Test Title', 'trace-id');

      expect(saveSpy).toHaveBeenCalledWith({
        pageId: '123',
        title: 'Test Title',
      });
    });

    it('should not throw error if save fails', async () => {
      jest
        .spyOn(wikiHistoryRepository, 'save')
        .mockRejectedValue(new Error('Save failed'));

      await expect(
        service.saveToHistory(123, 'Test Title'),
      ).resolves.not.toThrow();
    });
  });
});
