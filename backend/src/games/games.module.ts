import { Module } from "@nestjs/common";
import { GameService } from "./games.service";
import { GameController } from "./games.controller";
import { SteamLibraryImportService } from "./steam-library-import.service";
import { SteamGamesModule } from "src/steam-games/steam-games.modules";
import { IgdbModule } from "src/igdb/igdb.module";
import { SteamIgdbEnrichmentService } from "./steam-igdb-enrichment.service";

@Module({
	imports: [SteamGamesModule, IgdbModule],
	providers:[GameService, SteamLibraryImportService, SteamIgdbEnrichmentService],
	controllers: [GameController],
	exports:[GameService, SteamLibraryImportService],
})
export class GameModule{}	
