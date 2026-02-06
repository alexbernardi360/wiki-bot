import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getBotToken } from 'nestjs-telegraf';
import { ImageGeneratorService } from '../image-generator/image-generator.service';
import { WikipediaService } from '../wikipedia/wikipedia.service';
import { TelegramUpdate } from './telegram.update';

describe('TelegramUpdate', () => {
  let bot: TelegramUpdate;
  let wikipediaService: WikipediaService;
  let imageGeneratorService: ImageGeneratorService;
  let configService: ConfigService;
  let telegrafBot: any;

  const adminId = 12345;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramUpdate,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'TELEGRAM_ADMIN_CHAT_ID') return adminId.toString();
              return null;
            }),
          },
        },
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
        {
          provide: getBotToken(),
          useValue: {
            telegram: {
              setMyDescription: jest.fn(),
              setMyShortDescription: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    bot = module.get<TelegramUpdate>(TelegramUpdate);
    wikipediaService = module.get<WikipediaService>(WikipediaService);
    imageGeneratorService = module.get<ImageGeneratorService>(
      ImageGeneratorService,
    );
    configService = module.get<ConfigService>(ConfigService);
    telegrafBot = module.get(getBotToken());

    // Suppress logs during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(bot).toBeDefined();
  });

  describe('isAdmin', () => {
    it('should return true if chatId matches adminId', () => {
      const ctx = {
        chat: { id: adminId },
      } as any;
      expect((bot as any).isAdmin(ctx)).toBe(true);
    });

    it('should return false and log warning if chatId does not match', () => {
      const ctx = {
        chat: { id: 99999 },
        from: { id: 99999 },
      } as any;
      expect((bot as any).isAdmin(ctx)).toBe(false);
    });
  });

  describe('onRandom', () => {
    it('should process command if user is admin', async () => {
      const ctx = {
        chat: { id: adminId },
        update: { update_id: 111 },
        from: { id: adminId },
        reply: jest.fn(),
        replyWithPhoto: jest.fn(),
      } as any;

      const mockWikiData = {
        title: 'Test',
        extract_html: 'ext',
        originalimage: { source: 'src', width: 1, height: 1 },
      };
      const mockImage = Buffer.from('img');

      jest
        .spyOn(wikipediaService, 'getRandomPage')
        .mockResolvedValue(mockWikiData as any);
      jest
        .spyOn(imageGeneratorService, 'generatePostImage')
        .mockResolvedValue(mockImage);

      await bot.onRandom(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('Generating random page...');
      expect(wikipediaService.getRandomPage).toHaveBeenCalledWith(111);
      expect(imageGeneratorService.generatePostImage).toHaveBeenCalled();
      expect(ctx.replyWithPhoto).toHaveBeenCalledWith({ source: mockImage });
    });

    it('should do nothing if user is not admin', async () => {
      const ctx = {
        chat: { id: 99999 },
        from: { id: 99999 },
        reply: jest.fn(),
      } as any;

      await bot.onRandom(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
      expect(wikipediaService.getRandomPage).not.toHaveBeenCalled();
    });

    it('should notify user on error', async () => {
      const ctx = {
        chat: { id: adminId },
        update: { update_id: 111 },
        from: { id: adminId },
        reply: jest.fn(),
      } as any;

      jest
        .spyOn(wikipediaService, 'getRandomPage')
        .mockRejectedValue(new Error('Fail'));

      await bot.onRandom(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('Error generating page.');
    });
  });

  describe('onWiki', () => {
    it('should ask for title if missing', async () => {
      const ctx = {
        chat: { id: adminId },
        update: { update_id: 111 },
        from: { id: adminId },
        reply: jest.fn(),
      } as any;

      await bot.onWiki(ctx, '/wiki');

      expect(ctx.reply).toHaveBeenCalledWith(
        'Please provide a title. Usage: /wiki <title>',
      );
      expect(wikipediaService.getPageSummary).not.toHaveBeenCalled();
    });

    it('should search for title if provided', async () => {
      const ctx = {
        chat: { id: adminId },
        update: { update_id: 111 },
        from: { id: adminId },
        reply: jest.fn(),
        replyWithPhoto: jest.fn(),
      } as any;

      const mockWikiData = { title: 'T', extract_html: 'e' };
      jest
        .spyOn(wikipediaService, 'getPageSummary')
        .mockResolvedValue(mockWikiData as any);
      jest
        .spyOn(imageGeneratorService, 'generatePostImage')
        .mockResolvedValue(Buffer.from(''));

      await bot.onWiki(ctx, '/wiki Rome');

      expect(ctx.reply).toHaveBeenCalledWith('Searching for "Rome"...');
    });
  });

  describe('onModuleInit', () => {
    it('should update bot description and bio on startup', async () => {
      await bot.onModuleInit();
      expect(telegrafBot.telegram.setMyDescription).toHaveBeenCalled();
      expect(telegrafBot.telegram.setMyShortDescription).toHaveBeenCalled();
      expect(telegrafBot.telegram.setMyDescription).toHaveBeenCalledWith(
        expect.stringContaining('Wiki-Bot v'),
      );
      expect(telegrafBot.telegram.setMyShortDescription).toHaveBeenCalledWith(
        expect.stringContaining('Wiki-Bot v'),
      );
    });

    it('should handle error if bot info update fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      telegrafBot.telegram.setMyDescription.mockRejectedValue(
        new Error('Telegram Error'),
      );

      await bot.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update bot information'),
        expect.any(String),
      );
    });
  });
});
