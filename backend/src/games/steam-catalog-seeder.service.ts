import { BadRequestException, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { IgdbService } from "src/igdb/igdb.service";
import { SteamGamesService } from "src/steam-games/steam-games.service";
import { GameService } from "./games.service";
import { ExternalGameSource } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class SteamCatalogSeederService implements OnApplicationBootstrap{
	constructor(
		private readonly igdbService: IgdbService,
		private readonly steamGames: SteamGamesService,
		private readonly gameService: GameService,
		private readonly prisma: PrismaService,
		
	){}
	async onApplicationBootstrap(): Promise<void> {
		await this.seedIfDatabaseIsEmpty(500);
	}

	/**
	 * Seeds up to `targetCount` canonical multiplayer/co-op games.
	 * We stop only after enough final games were persisted, not after a fixed number of Steam candidates.
	 */
	async seedMostPopularMultiplayerGames(targetCount: number): Promise<number> {
		if (!Number.isInteger(targetCount) || targetCount <= 0)
			throw new BadRequestException("Target count must be a positive integer");
		const mostPlayedGames = await this.steamGames.getMostPlayedSteamGames();
		let processed = 0;
		let steamCandidatesExamined = 0;
		let igdbMatched = 0;
		let multiplayerEligible = 0;
		const seededGameIds = new Set<string>();

		for (const mostPlayedGame of mostPlayedGames){
			if (processed >= targetCount)
				break;
			steamCandidatesExamined += 1;
			const igdbGameId = await this.igdbService.getGameIdBySteamAppId(mostPlayedGame.appId);
			if (!igdbGameId)
				continue;
			igdbMatched += 1;
			const details = await this.igdbService.getGameDetails(igdbGameId);
			if (!details.supportsMultiplayerOrCoop)
				continue;
			multiplayerEligible += 1;
			const game = await this.gameService.upsertFromExternal({
				source: ExternalGameSource.IGDB,
				externalId: details.igdbId,
				externalUrl: null,
				canonicalSlug: details.name,
				name: details.name,
				summary: details.summary,
				coverUrl:details.coverUrl,
				firstReleaseDate: details.firstReleaseDate,
			});
			const existingSteamGame = await this.gameService.findByExternalId(
				ExternalGameSource.STEAM,
				mostPlayedGame.appId,
			);
			if (!existingSteamGame) {
				await this.gameService.linkExternalId(
					game.id,
				ExternalGameSource.STEAM,
				mostPlayedGame.appId,
				`https://store.steampowered.com/app/${mostPlayedGame.appId}`,
				)
			}
			if (seededGameIds.has(game.id))
				continue;
			const sourceTags = [
				...details.genres,
				...details.themes,
				...details.keywords,
			];
			await this.gameService.upsertSourceTagsForGame(
				game.id,
				ExternalGameSource.IGDB,
				sourceTags,
			)
			seededGameIds.add(game.id);
			processed +=1;
		}
		console.info("[SteamCatalogSeederService] seed diagnostics", {
			targetCount,
			steamCandidatesExamined,
			igdbMatched,
			multiplayerEligible,
			processed,
		});
		return processed;
	}
	async seedIfDatabaseIsEmpty(limit: number): Promise<number> {
		if (!Number.isInteger(limit) || limit <= 0)
			throw new BadRequestException("Limit must be a positive integer");
		const existingIgdbTags = await this.prisma.gameSourceTag.count ({
			where: {
				source: ExternalGameSource.IGDB,
			},
		});
		if (existingIgdbTags > 0)
			return 0;
		return this.seedMostPopularMultiplayerGames(limit);
	}
}
