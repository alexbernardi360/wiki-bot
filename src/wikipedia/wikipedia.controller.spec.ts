import { Test, TestingModule } from '@nestjs/testing';
import { WikipediaController } from './wikipedia.controller';
import { WikipediaService } from './wikipedia.service';
import { ImageGeneratorService } from '../image-generator/image-generator.service';
import { StreamableFile, Logger } from '@nestjs/common';

describe('WikipediaController', () => {
  let controller: WikipediaController;
  let wikipediaService: WikipediaService;
  let imageGenerator: ImageGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WikipediaController],
      providers: [
        {
          provide: WikipediaService,
          useValue: {
            getRandomPage: jest.fn(),
            getPageSummary: jest.fn(),
          },
        },
        {
          provide: ImageGeneratorService,
          useValue: {
            generatePostImage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WikipediaController>(WikipediaController);
    wikipediaService = module.get<WikipediaService>(WikipediaService);
    imageGenerator = module.get<ImageGeneratorService>(ImageGeneratorService);

    // Suppress logs during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRandom', () => {
    it('should call wikipediaService.getRandomPage', async () => {
      const mockResult = { title: 'Test', extract: 'Test' };
      jest
        .spyOn(wikipediaService, 'getRandomPage')
        .mockResolvedValue(mockResult as any);

      const result = await controller.getRandom();

      expect(result).toBe(mockResult);
      expect(wikipediaService.getRandomPage).toHaveBeenCalled();
    });
  });

  describe('getImagePreview', () => {
    it('should generate an image preview from a random page', async () => {
      const mockWikiData = {
        title: 'Test',
        extract_html: '<p>Test</p>',
        originalimage: { source: 'url', width: 100, height: 100 },
      };
      const mockBuffer = Buffer.from('image');

      jest
        .spyOn(wikipediaService, 'getRandomPage')
        .mockResolvedValue(mockWikiData as any);
      jest
        .spyOn(imageGenerator, 'generatePostImage')
        .mockResolvedValue(mockBuffer);

      const result = await controller.getImagePreview('light');

      expect(result).toBeInstanceOf(StreamableFile);
      expect(wikipediaService.getRandomPage).toHaveBeenCalled();
      expect(imageGenerator.generatePostImage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockWikiData.title,
          theme: 'light',
        }),
      );
    });
  });

  describe('getImagePreviewByTitle', () => {
    it('should generate an image preview for a specific title', async () => {
      const title = 'Test_Title';
      const mockWikiData = {
        title: 'Test',
        extract_html: '<p>Test</p>',
        originalimage: { source: 'url', width: 100, height: 100 },
      };
      const mockBuffer = Buffer.from('image');

      jest
        .spyOn(wikipediaService, 'getPageSummary')
        .mockResolvedValue(mockWikiData as any);
      jest
        .spyOn(imageGenerator, 'generatePostImage')
        .mockResolvedValue(mockBuffer);

      const result = await controller.getImagePreviewByTitle(title, 'dark');

      expect(result).toBeInstanceOf(StreamableFile);
      expect(wikipediaService.getPageSummary).toHaveBeenCalledWith(title);
      expect(imageGenerator.generatePostImage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockWikiData.title,
          theme: 'dark',
        }),
      );
    });
  });
});
