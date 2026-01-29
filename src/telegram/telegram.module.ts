import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { ImageGeneratorModule } from '../image-generator/image-generator.module';
import { WikipediaModule } from '../wikipedia/wikipedia.module';
import { TelegramUpdate } from './telegram.update';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN') || '',
      }),
      inject: [ConfigService],
    }),
    WikipediaModule,
    ImageGeneratorModule,
  ],
  providers: [TelegramUpdate],
})
export class TelegramModule {}
