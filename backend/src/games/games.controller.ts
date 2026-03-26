import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { GameService } from "./games.service";
import { UpsertExternalGameDto } from "./dto/upsert-external-game.dto";
import { SteamLibraryImportService } from "./steam-library-import.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { IgdbService } from "src/igdb/igdb.service";
import { SearchCatalogQueryDto } from "./dto/search-catalog-query.dto";
import { SteamGamesService } from "src/steam-games/steam-games.service";
import { Public } from "src/auth/public.decorator";
import { AddOwnedGameDto } from "./dto/add-owned-game.dto";
import { SteamIgdbEnrichmentService } from "./steam-igdb-enrichment.service";


@Controller("api/games")
export class GameController {
	constructor(
		private readonly gameService: GameService,
		private readonly steamImport: SteamLibraryImportService,
		private readonly igdbService: IgdbService,
		private readonly steamGames: SteamGamesService,
		private readonly steamIgdbEnrichment: SteamIgdbEnrichmentService,
	) {}
	@Public()
	@Get("popular")
	getPopularGames() {
		return this.steamGames.getMostPlayedGames();
	}

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
	@UseGuards(JwtAuthGuard)
	@Get("steam/preview/me")
	previewMySteamImport(@CurrentUser("id") userId: string) {
		return this.steamImport.previewImportForUser(userId);
	}
	@UseGuards(JwtAuthGuard)
	@Get("catalog")
	searchCatalog(@Query() query: SearchCatalogQueryDto) {
		const limit = query.limit ?? 10;
		return this.igdbService.searchCatalog(query.query, limit);
	}
	@UseGuards(JwtAuthGuard)
	@Get("me/library")
	listMyLibrary(@CurrentUser("id") userId: string) {
		return this.gameService.listOwnedGamesForUser(userId);
	}
	@UseGuards(JwtAuthGuard)
	@Post("me/library")
	addOwnedGame(@CurrentUser("id") userId: string,
	@Body() body: AddOwnedGameDto) {
		return this.gameService.addOwnedGameForUser(userId, body.igdbId);
	}
	@UseGuards(JwtAuthGuard)
	@Delete("me/library/:gameId")
	removeOwnedGame(@CurrentUser("id") userId: string,
	@Param("gameId") gameId: string,
	){
		return this.gameService.removeOwnedGameForUser(userId, gameId);
	}
	@UseGuards(JwtAuthGuard)
	@Post("steam/enrich-igdb/me")
	async enrichMySteamGamesWithIgdb(@CurrentUser("id") userId: string){
		const processed = await this.steamIgdbEnrichment.enrichOwnedSteamGamesMissingIgdbData(userId);
		return {processed};
	}
}
