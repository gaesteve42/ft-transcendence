import { Module } from "@nestjs/common";
import { SteamAuthService } from "./steam-auth.service";
import { UsersService } from "src/users/users.service";
import { UsersModule } from "src/users/users.module";
import { LoggingModule } from "src/common/logging/logging.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
	imports: [UsersModule,
		LoggingModule, JwtModule],
	providers: [SteamAuthService],
})
export class SteamAuthModule{}