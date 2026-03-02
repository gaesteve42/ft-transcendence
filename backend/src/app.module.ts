import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LobbiesModule } from './lobbies/lobbies.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { LoggingModule } from './common/logging/logging.module';
import { PrismaModule } from './prisma/prisma.module';
@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [".env", "../.env"]}),
    LobbiesModule,
    AuthModule,
    LoggingModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

