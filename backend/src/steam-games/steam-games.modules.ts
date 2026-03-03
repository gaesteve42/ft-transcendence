import { Module } from "@nestjs/common";
import { SteamGamesService } from "./steam-games.service";

@Module({
	providers: [SteamGamesService],
	exports: [SteamGamesService]

})
export class SteamGamesModule{}