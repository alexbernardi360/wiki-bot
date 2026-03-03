import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImageGeneratorModule } from './image-generator/image-generator.module';
import { SystemInfoModule } from './system-info/system-info.module';
import { TelegramModule } from './telegram/telegram.module';
import { WikipediaModule } from './wikipedia/wikipedia.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/database.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    }),
    WikipediaModule,
    ImageGeneratorModule,
    TelegramModule,
    SystemInfoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
