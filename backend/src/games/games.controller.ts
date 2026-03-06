import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { GameService } from "./games.service";
import { UpsertExternalGameDto } from "./dto/upsert-external-game.dto";
import { SteamLibraryImportService } from "./steam-library-import.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";

@Controller("api/games")
export class GameController {
	constructor(
		private readonly gameService: GameService,
		private readonly steamImport: SteamLibraryImportService,
	) {}
	@Post("upsert-external")
	upsert(@Body() body: UpsertExternalGameDto) {
		const input = {
			externalId: body.externalId,
			name: body.name,
			source: body.source,
			externalUrl: body.externalUrl,
			canonicalSlug: body.canonicalSlug,
			summary: body.summary,
			coverUrl: body.coverUrl,
			firstReleaseDate: body.firstReleaseDate ? new Date(body.firstReleaseDate) : null,
		};
		return this.gameService.upsertFromExternal(input);
	}
	@Get("steam/:steamId/preview")
	previewSteamImport(@Param("steamId") steamId: string) {
		return this.steamImport.previewImport(steamId);
	}
	@Post("steam/:steamId/import")
	importSteamLibrary(@Param("steamId") steamId: string) {
		return this.steamImport.importLibrary(steamId);
	}

	@UseGuards(JwtAuthGuard)
	@Post("steam/import/me")
	importMySteamLibrary(@CurrentUser("id") userId: string) {
		return this.steamImport.importLibraryForUser(userId);
	}
}
