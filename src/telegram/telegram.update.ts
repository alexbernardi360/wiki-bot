import { Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  Action,
  Command,
  Ctx,
  InjectBot,
  Message,
  Start,
  Update,
} from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import * as pkg from '../../package.json';
import { ImageGeneratorService } from '../image-generator/image-generator.service';
import { SystemInfoService } from '../system-info/system-info.service';
import { WikipediaService } from '../wikipedia/wikipedia.service';

@Update()
export class TelegramUpdate implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramUpdate.name);
  private readonly adminChatId: number;

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService,
    private readonly wikipediaService: WikipediaService,
    private readonly imageGeneratorService: ImageGeneratorService,
    private readonly systemInfoService: SystemInfoService,
  ) {
    this.adminChatId = Number(
      this.configService.get<string>('TELEGRAM_ADMIN_CHAT_ID'),
    );
  }

  async onModuleInit() {
    try {
      this.logger.log(
        `Updating bot description and bio to version v${pkg.version}`,
      );

      // Update "About" (long description)
      await this.bot.telegram.setMyDescription(
        `Wiki-Bot v${pkg.version} - Generate Wikipedia images directly on Telegram.`,
      );

      // Update "Bio" (short description)
      await this.bot.telegram.setMyShortDescription(
        `Wiki-Bot v${pkg.version} - Wikipedia image generator.`,
      );

      this.logger.log('Bot description and bio updated successfully');
    } catch (e) {
      this.logger.error(
        `Failed to update bot information: ${e.message}`,
        e.stack,
      );
    }
  }

  async onApplicationBootstrap() {
    try {
      this.logger.log('Sending startup notification to administrator');
      const message = `🚀 Wiki-Bot is Online!\nVersion: v${pkg.version}\nStatus: Initialization completed successfully.`;
      await this.bot.telegram.sendMessage(this.adminChatId, message);
      this.logger.log('Startup notification sent successfully');
    } catch (e) {
      this.logger.error(
        `Failed to send startup notification: ${e.message}`,
        e.stack,
      );
    }
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
    const message =
      `👋 <b>Welcome to Wiki-Bot!</b>\n\n` +
      `I can help you generate images from Wikipedia articles.\n\n` +
      `<b>Commands:</b>\n` +
      `🎲 /random - Generate a random Wikipedia article\n` +
      `🔍 /wiki &lt;title&gt; - Generate a specific Wikipedia article\n` +
      `ℹ️ /status - Check bot status`;
    await ctx.reply(message, { parse_mode: 'HTML' });
  }

  @Command('random')
  async onRandom(@Ctx() ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    const traceId = ctx.update.update_id;

    this.logger.log(
      `Processing /random command from user ${ctx.from?.id} in chat ${ctx.chat?.id}`,
      { traceId },
    );
    await ctx.reply('Generating random page...');
    try {
      const wikiData = await this.wikipediaService.getRandomPage(traceId);
      await this.sendWikiImage(ctx, wikiData, traceId);
      this.logger.log(
        `Successfully processed /random for user ${ctx.from?.id}`,
        {
          traceId,
        },
      );
    } catch (e) {
      this.logger.error(
        `Error processing /random for user ${ctx.from?.id}: ${e.message}`,
        { traceId, stack: e.stack },
      );
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
    this.logger.log(
      `Processing /wiki command for "${title}" from user ${ctx.from?.id} in chat ${ctx.chat?.id}`,
      { traceId },
    );
    await ctx.reply(`Searching for "${title}"...`);
    try {
      const wikiData = await this.wikipediaService.getPageSummary(
        title,
        traceId,
      );

      // Check if page was already posted
      const exists = await this.wikipediaService.isPageInHistory(
        wikiData.pageid,
      );
      if (exists) {
        await this.sendWikiImage(ctx, wikiData, traceId, false);
        return;
      }

      await this.sendWikiImage(ctx, wikiData, traceId);
      this.logger.log(
        `Successfully processed /wiki for "${title}" for user ${ctx.from?.id}`,
        { traceId },
      );
    } catch (e) {
      this.logger.error(
        `Error processing /wiki for "${title}" for user ${ctx.from?.id}: ${e.message}`,
        { traceId, stack: e.stack },
      );
      await ctx.reply('Error fetching page. Check if the title is correct.');
    }
  }

  @Command('status')
  async onStatus(@Ctx() ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    const traceId = ctx.update.update_id;

    this.logger.log(
      `Processing /status command from user ${ctx.from?.id} in chat ${ctx.chat?.id}`,
      { traceId },
    );

    try {
      const status = await this.systemInfoService.getSystemStatus();
      const message =
        `🤖 <b>Wiki-Bot Status</b>\n\n` +
        `ℹ️ <b>Version:</b> ${status.botVersion}\n` +
        `💻 <b>OS:</b> ${status.osInfo.distro} ${status.osInfo.release} (${status.osInfo.platform})\n` +
        `🧠 <b>RAM:</b> ${status.memory.used} / ${status.memory.total}\n` +
        `⚙️ <b>CPU:</b> ${status.cpu.load}% (${status.cpu.cores} cores)\n` +
        `🌡️ <b>Temp:</b> ${status.cpu.temp}\n` +
        `🖥️ <b>System Uptime:</b> ${status.uptime}\n` +
        `🤖 <b>Bot Uptime:</b> ${status.botUptime}`;

      await ctx.reply(message, { parse_mode: 'HTML' });
      this.logger.log(
        `Successfully processed /status for user ${ctx.from?.id}`,
        { traceId },
      );
    } catch (e) {
      this.logger.error(
        `Error processing /status for user ${ctx.from?.id}: ${e.message}`,
        { traceId, stack: e.stack },
      );
      await ctx.reply('Error retrieving system status.');
    }
  }

  @Action(/accept:(.+):(.+)/)
  async onAccept(@Ctx() ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    const match = (ctx as any).match;
    const pageId = match[1];
    const title = match[2];

    this.logger.log(`Image accepted for "${title}" (ID: ${pageId})`);

    try {
      await this.wikipediaService.saveToHistory(pageId, title);
      await ctx.editMessageCaption(
        `✅ <b>Approved:</b> ${title}\n(Sent to Instagram staging)`,
        { parse_mode: 'HTML', reply_markup: undefined },
      );
      await ctx.answerCbQuery('Approved and saved to history!');
    } catch (e) {
      this.logger.error(`Error in onAccept: ${e.message}`, e.stack);
      await ctx.answerCbQuery('Error saving to history.');
    }
  }

  @Action(/reject:(.+)/)
  async onReject(@Ctx() ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    const match = (ctx as any).match;
    const title = match[1];

    this.logger.log(`Image rejected for "${title}"`);

    try {
      await ctx.editMessageCaption(`❌ <b>Rejected:</b> ${title}`, {
        parse_mode: 'HTML',
        reply_markup: undefined,
      });
      await ctx.answerCbQuery('Discretionary rejection.');
    } catch (e) {
      this.logger.error(`Error in onReject: ${e.message}`, e.stack);
      await ctx.answerCbQuery('Error updating message.');
    }
  }

  @Action('retry')
  async onRetry(@Ctx() ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    this.logger.log(`Retry action triggered by user ${ctx.from?.id}`);
    try {
      await ctx.answerCbQuery('Generating a new random page...');
      // In Telegraf, we can't easily "forward" to onRandom because of context differences,
      // so we call the logic directly or trigger onRandom if compatible.
      return this.onRandom(ctx);
    } catch (e) {
      this.logger.error(`Error in onRetry: ${e.message}`, e.stack);
      await ctx.answerCbQuery('Error triggering retry.');
    }
  }

  @Cron(process.env.DAILY_SCHEDULE_TIME || '00 09 * * *')
  async handleDailyRandom() {
    this.logger.log('Running daily scheduled random Wikipedia image task');
    const traceId = Date.now();
    try {
      const wikiData = await this.wikipediaService.getRandomPage(traceId);
      await this.sendWikiImage(
        this.adminChatId,
        wikiData,
        traceId,
        true,
        ' <b>Daily Random:</b> ',
      );
      this.logger.log('Daily scheduled task completed successfully');
    } catch (e) {
      this.logger.error(`Error in daily scheduled task: ${e.message}`, e.stack);
    }
  }

  /**
   * Generates the inline keyboard for accepting, rejecting, or retrying an image.
   * Titles are truncated to 40 characters to fit within Telegram's callback data limit.
   *
   * @param title - The title of the Wikipedia page.
   * @param pageid - The ID of the Wikipedia page.
   * @returns A Telegram inline keyboard markup.
   */
  private buildApprovalKeyboard(title: string, pageid: number) {
    const safeTitle =
      title.length > 40 ? title.substring(0, 37) + '...' : title;
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Accept', `accept:${pageid}:${safeTitle}`),
        Markup.button.callback('❌ Reject', `reject:${safeTitle}`),
      ],
      [Markup.button.callback('🔄 Retry', 'retry')],
    ]);
  }

  /**
   * Generates and sends a Wikipedia image to a specified chat or context.
   * Handles user context parsing, image generation, caption formatting, and keyboard attachment.
   *
   * @param target - The Telegraf Context object or a Telegram chat ID.
   * @param wikiData - The Wikipedia page data containing title, extract, and image info.
   * @param traceId - Optional trace ID for logging purposes.
   * @param showKeyboard - Whether to show the approval/rejection keyboard (default: true).
   * @param captionPrefix - Optional prefix to add before the caption text.
   */
  private async sendWikiImage(
    target: Context | number | string,
    wikiData: any,
    traceId?: string | number,
    showKeyboard = true,
    captionPrefix = '',
  ) {
    const isContext = typeof target === 'object';
    const chatId = isContext ? (target as Context).chat?.id : target;
    const fromId = isContext ? (target as Context).from?.id : 'system';

    this.logger.debug(`Generating image for "${wikiData.title}"...`, {
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

    const caption = showKeyboard
      ? captionPrefix
        ? `${captionPrefix}${wikiData.title}`
        : `<b>${wikiData.title}</b>`
      : `⚠️ <b>Already in history:</b> ${wikiData.title}`;

    const extraParams: any = { caption, parse_mode: 'HTML' };

    if (showKeyboard) {
      Object.assign(
        extraParams,
        this.buildApprovalKeyboard(wikiData.title, wikiData.pageid),
      );
    }

    if (isContext) {
      await (target as Context).replyWithPhoto(
        { source: imageBuffer },
        extraParams,
      );
    } else {
      await this.bot.telegram.sendPhoto(
        chatId as string | number,
        { source: imageBuffer },
        extraParams,
      );
    }

    this.logger.log(
      `Image for "${wikiData.title}" sent ${showKeyboard ? 'with approval keyboard' : '(preview only)'} to ${isContext ? 'user ' + fromId : 'chat ' + chatId}`,
      { traceId },
    );
  }
}
