import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController} from "./auth.controller";
import { UsersModule } from "src/users/users.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { LoggingModule } from "src/common/logging/logging.module";
import { SteamAuthService } from "./steam-auth.service";
import { SteamStrategy } from "./steam-strategy";


@Module({
	imports: [
		UsersModule,
		LoggingModule,
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				const secret = config.get<string>("JWT_SECRET");
				const expiresIn = Number(config.get<string>("JWT_EXPIRES_IN_SECONDES") ?? "900");
				if (!secret)
					throw new Error("JWT_SECRET is missing");
				if (!Number.isFinite(expiresIn) || expiresIn <= 0)
					throw new Error("JWT_EXPIRES_IN_SECONDES must be a positive number");
				return {
					secret,
					signOptions: { expiresIn},
				};
			},
		}),
	],
	controllers:[AuthController],
	providers:[AuthService, JwtStrategy, SteamAuthService, SteamStrategy],
})
export class AuthModule{}