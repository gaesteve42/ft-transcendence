import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LobbiesModule } from './lobbies/lobbies.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({isGlobal: true}),LobbiesModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
