import { Update, Start, Command, Ctx, Message } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { WikipediaService } from '../wikipedia/wikipedia.service';
import { ImageGeneratorService } from '../image-generator/image-generator.service';

@Update()
export class TelegramUpdate {
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
    return ctx.chat.id == this.adminChatId;
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    await ctx.reply('Welcome! Use /random or /wiki <title> to test.');
  }

  @Command('random')
  async onRandom(@Ctx() ctx: Context) {
    if (!this.isAdmin(ctx)) return;
    await ctx.reply('Generating random page...');
    try {
      const wikiData = await this.wikipediaService.getRandomPage();
      await this.sendWikiImage(ctx, wikiData);
    } catch (e) {
      console.error(e);
      await ctx.reply('Error generating page.');
    }
  }

  @Command('wiki')
  async onWiki(@Ctx() ctx: Context, @Message('text') msg: string) {
    if (!this.isAdmin(ctx)) return;
    const title = msg.split(' ').slice(1).join(' ');
    if (!title) {
      await ctx.reply('Please provide a title. Usage: /wiki <title>');
      return;
    }
    await ctx.reply(`Searching for "${title}"...`);
    try {
      const wikiData = await this.wikipediaService.getPageSummary(title);
      await this.sendWikiImage(ctx, wikiData);
    } catch (e) {
      console.error(e);
      await ctx.reply('Error fetching page. Check if the title is correct.');
    }
  }

  private async sendWikiImage(ctx: Context, wikiData: any) {
    const imageBuffer = await this.imageGeneratorService.generatePostImage({
      title: wikiData.title,
      extract_html: wikiData.extract_html,
      imageUrl: wikiData.originalimage?.source,
      imageWidth: wikiData.originalimage?.width,
      imageHeight: wikiData.originalimage?.height,
    });

    await ctx.replyWithPhoto({ source: imageBuffer });
  }
}
