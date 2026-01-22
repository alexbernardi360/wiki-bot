import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WikipediaModule } from './wikipedia/wikipedia.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WikipediaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
