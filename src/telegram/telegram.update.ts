import { Update, Start, Command, Ctx, Message } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { WikipediaService } from '../wikipedia/wikipedia.service';
import { ImageGeneratorService } from '../image-generator/image-generator.service';

@Update()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);
  private readonly adminChatId: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly wikipediaService: WikipediaService,
    private readonly imageGeneratorService: ImageGeneratorService,
  ) {
    this.adminChatId = Number(
      this.configService.get<string>('TELEGRAM_ADMIN_CHAT_ID'),
    );
  }

  private isAdmin(ctx: Context): boolean {
    if (!ctx.chat) return false;

    // Check if chatId matches (ignoring type mismatch slightly)
    const isAdmin = ctx.chat.id == this.adminChatId;
    if (!isAdmin) {
      this.logger.warn(
        `Unauthorized access attempt from user ${ctx.from?.id} in chat ${ctx.chat.id}`,
      );
    }
    return isAdmin;
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    this.logger.log(`Start command received from user ${ctx.from?.id}`);
    await ctx.reply('Welcome! Use /random or /wiki <title> to test.');
  }

  @Command('random')
  async onRandom(@Ctx() ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    const traceId = ctx.update.update_id;

    this.logger.log({
      message: `Processing /random command from user ${ctx.from?.id} in chat ${ctx.chat?.id}`,
      traceId,
    });
    await ctx.reply('Generating random page...');
    try {
      const wikiData = await this.wikipediaService.getRandomPage(traceId);
      await this.sendWikiImage(ctx, wikiData, traceId);
      this.logger.log({
        message: `Successfully processed /random for user ${ctx.from?.id}`,
        traceId,
      });
    } catch (e) {
      this.logger.error({
        message: `Error processing /random for user ${ctx.from?.id}: ${e.message}`,
        traceId,
        stack: e.stack,
      });
      await ctx.reply('Error generating page.');
    }
  }

  @Command('wiki')
  async onWiki(@Ctx() ctx: Context, @Message('text') msg: string) {
    if (!this.isAdmin(ctx)) return;
    const traceId = ctx.update.update_id;

    const title = msg.split(' ').slice(1).join(' ');
    if (!title) {
      await ctx.reply('Please provide a title. Usage: /wiki <title>');
      return;
    }
    this.logger.log({
      message: `Processing /wiki command for "${title}" from user ${ctx.from?.id} in chat ${ctx.chat?.id}`,
      traceId,
    });
    await ctx.reply(`Searching for "${title}"...`);
    try {
      const wikiData = await this.wikipediaService.getPageSummary(
        title,
        traceId,
      );
      await this.sendWikiImage(ctx, wikiData, traceId);
      this.logger.log({
        message: `Successfully processed /wiki for "${title}" for user ${ctx.from?.id}`,
        traceId,
      });
    } catch (e) {
      this.logger.error({
        message: `Error processing /wiki for "${title}" for user ${ctx.from?.id}: ${e.message}`,
        traceId,
        stack: e.stack,
      });
      await ctx.reply('Error fetching page. Check if the title is correct.');
    }
  }

  private async sendWikiImage(
    ctx: Context,
    wikiData: any,
    traceId?: string | number,
  ) {
    this.logger.log({
      message: `Generating image for "${wikiData.title}"...`,
      traceId,
    });
    const imageBuffer = await this.imageGeneratorService.generatePostImage(
      {
        title: wikiData.title,
        extract_html: wikiData.extract_html,
        imageUrl: wikiData.originalimage?.source,
        imageWidth: wikiData.originalimage?.width,
        imageHeight: wikiData.originalimage?.height,
      },
      traceId,
    );

    await ctx.replyWithPhoto({ source: imageBuffer });
    this.logger.log({
      message: `Image for "${wikiData.title}" sent to user ${ctx.from?.id}`,
      traceId,
    });
  }
}
