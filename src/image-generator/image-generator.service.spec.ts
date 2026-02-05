import { Test, TestingModule } from '@nestjs/testing';
import { ImageGeneratorService } from './image-generator.service';
import nodeHtmlToImage from 'node-html-to-image';
import { Logger } from '@nestjs/common';

// Mock node-html-to-image
jest.mock('node-html-to-image');

describe('ImageGeneratorService', () => {
  let service: ImageGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageGeneratorService],
    }).compile();

    service = module.get<ImageGeneratorService>(ImageGeneratorService);
    jest.clearAllMocks();

    // Suppress logs during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePostImage', () => {
    const mockData = {
      title: 'Test Title',
      extract_html: '<p>Test extract</p>',
      imageUrl: 'http://example.com/image.jpg',
      imageWidth: 1000,
      imageHeight: 500,
      theme: 'light' as const,
    };

    it('should generate an image and return a Buffer', async () => {
      const mockBuffer = Buffer.from('mock image');
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(mockBuffer);

      const result = await service.generatePostImage(mockData);

      expect(result).toEqual(mockBuffer);
      expect(nodeHtmlToImage).toHaveBeenCalled();
    });

    it('should detect landscape layout when width > height', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));

      await service.generatePostImage({
        ...mockData,
        imageWidth: 1000,
        imageHeight: 500,
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            isLandscape: true,
          }),
        }),
      );
    });

    it('should detect portrait layout when width <= height', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));

      await service.generatePostImage({
        ...mockData,
        imageWidth: 500,
        imageHeight: 1000,
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            isLandscape: false,
          }),
        }),
      );
    });

    it('should use smaller font size for long text', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));
      const longText = 'a'.repeat(401);

      await service.generatePostImage({
        ...mockData,
        extract_html: `<p>${longText}</p>`,
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            fontSize: '26px',
          }),
        }),
      );
    });

    it('should use larger font size for short text', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));

      await service.generatePostImage({
        ...mockData,
        extract_html: '<p>Short text</p>',
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            fontSize: '34px',
          }),
        }),
      );
    });

    it('should use dark theme colors when specified', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));

      await service.generatePostImage({
        ...mockData,
        theme: 'dark',
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            colors: expect.objectContaining({
              cardBg: '#202122',
            }),
          }),
        }),
      );
    });

    it('should handle extremely long titles', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));
      const longTitle = 'A'.repeat(500);

      await service.generatePostImage({
        ...mockData,
        title: longTitle,
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: longTitle,
          }),
        }),
      );
    });

    it('should handle missing titles gracefully', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));

      await service.generatePostImage({
        ...mockData,
        title: '',
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '',
          }),
        }),
      );
    });

    it('should handle extremely long descriptions', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));
      const longExtract = 'B'.repeat(2000);

      await service.generatePostImage({
        ...mockData,
        extract_html: `<p>${longExtract}</p>`,
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            fontSize: '26px', // Long text should trigger smaller font
          }),
        }),
      );
    });

    it('should handle missing descriptions gracefully', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));

      await service.generatePostImage({
        ...mockData,
        extract_html: '',
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            extract_html: '',
            fontSize: '34px', // Empty text should trigger larger font
          }),
        }),
      );
    });

    it('should handle missing imageUrl gracefully', async () => {
      (nodeHtmlToImage as jest.Mock).mockResolvedValue(Buffer.from(''));

      await service.generatePostImage({
        ...mockData,
        imageUrl: undefined,
      });

      expect(nodeHtmlToImage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            imageUrl: undefined,
          }),
        }),
      );
    });
  });
});
