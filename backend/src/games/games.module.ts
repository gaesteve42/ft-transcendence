import { Module } from "@nestjs/common";
import { GameService } from "./games.service";
import { GameController } from "./games.controller";
import { SteamLibraryImportService } from "./steam-library-import.service";
import { SteamGamesModule } from "src/steam-games/steam-games.modules";

@Module({
	imports: [SteamGamesModule],
	providers:[GameService, SteamLibraryImportService],
	controllers: [GameController],
	exports:[GameService, SteamLibraryImportService],
})
export class GameModule{}	
