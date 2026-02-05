import { Test, TestingModule } from '@nestjs/testing';
import { WikipediaService, WikiResponse } from './wikipedia.service';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { InternalServerErrorException, Logger } from '@nestjs/common';

describe('WikipediaService', () => {
  let service: WikipediaService;
  let httpService: HttpService;

  const mockWikiResponse: WikiResponse = {
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
      ],
    }).compile();

    service = module.get<WikipediaService>(WikipediaService);
    httpService = module.get<HttpService>(HttpService);

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
});
