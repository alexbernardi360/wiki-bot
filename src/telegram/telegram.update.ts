import { Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Command,
  Ctx,
  InjectBot,
  Message,
  Start,
  Update,
} from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
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

  private async sendWikiImage(
    ctx: Context,
    wikiData: any,
    traceId?: string | number,
  ) {
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

    await ctx.replyWithPhoto({ source: imageBuffer });
    this.logger.log(
      `Image for "${wikiData.title}" sent to user ${ctx.from?.id}`,
      { traceId },
    );
  }
}
