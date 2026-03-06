import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LobbiesModule } from './lobbies/lobbies.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { LoggingModule } from './common/logging/logging.module';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './games/games.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [".env", "../.env"]}),
    LobbiesModule,
    AuthModule,
    LoggingModule,
    PrismaModule,
    GameModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
