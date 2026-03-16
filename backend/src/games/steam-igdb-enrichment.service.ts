import { BadRequestException, Injectable } from "@nestjs/common";
import { SteamGameNeedingIgdbEnrichment } from "./types/game";
import { PrismaService } from "src/prisma/prisma.service";
import { ExternalGameSource } from "@prisma/client";
import { IgdbService } from "src/igdb/igdb.service";
import { GameService } from "./games.service";


@Injectable()
export class SteamIgdbEnrichmentService
{
	constructor( 
		private readonly prisma : PrismaService,
		private readonly igdbService: IgdbService,
		private readonly gameService: GameService,
	){}

	/**
	 * Finds canonical games that were imported from Steam but still have no IGDB mapping.
	 * Those games are the first enrichment candidates because they cannot have IGDB tags yet.
	 */
	async findOwnedSteamGamesNeedingIgdbEnrichment(userId: string): Promise<SteamGameNeedingIgdbEnrichment[]> {
		const cleanUserId = userId.trim();
		if (cleanUserId.length === 0)
			throw new BadRequestException("User ID is required");
		const ownedGames = await this.prisma.userGame.findMany({
			where: {
				userId: cleanUserId,
				owned: true,
			},
			include: {
				game: {
					include: {
						externalIds: true,
					},
				},
			},
		});
		return ownedGames.flatMap((ownedGames) => {
			const steamMapping = ownedGames.game.externalIds.find(
				(externalId) => externalId.source === ExternalGameSource.STEAM,);	
			if (!steamMapping)
				return [];
			const hasIgdbMapping = ownedGames.game.externalIds.some((externalId) => externalId.source === ExternalGameSource.IGDB,);
			if (hasIgdbMapping)
				return [];
			return [{
				gameId: ownedGames.gameId,
				steamAppId: steamMapping.externalId,
			}];
		});
	}

	/**
	 * Enriches one Steam-imported canonical game with IGDB metadata and tags.
	 * If no IGDB mapping exists for the Steam app id, the method exits silently.
	 */
	async enrichSteamGameFromIgdb(gameId: string, steamAppId: string): Promise<void> {
		const cleanGameId = gameId.trim();
		const cleanSteamAppId = steamAppId.trim();

		if (cleanGameId.length === 0)
			throw new BadRequestException("Game ID is required");
		if (cleanSteamAppId.length === 0)
			throw new BadRequestException("App ID is required");
		const igdbGameId = await this.igdbService.getGameIdBySteamAppId(cleanSteamAppId);
		if (!igdbGameId)
			return ;
		const details = await this.igdbService.getGameDetails(igdbGameId);
		await this.gameService.linkExternalId(cleanGameId, ExternalGameSource.IGDB, igdbGameId, null);
		await this.gameService.enrichCanonicalGameIfMissing(cleanGameId, {
			summary: details.summary,
			coverUrl: details.coverUrl,
			firstReleaseDate: details.firstReleaseDate,
		});
		const sourceTags = [
			...details.genres,
			...details.themes,
			...details.keywords,
		];
		await this.gameService.upsertSourceTagsForGame(cleanGameId, ExternalGameSource.IGDB, sourceTags);
	}
	async enrichOwnedSteamGamesMissingIgdbData(userId: string) : Promise<number> {
		const pendingGames = await this.findOwnedSteamGamesNeedingIgdbEnrichment(userId);
		
		for (const pendingGame of pendingGames){
			await this.enrichSteamGameFromIgdb(pendingGame.gameId, pendingGame.steamAppId);
		}
		return pendingGames.length;
	}
}
