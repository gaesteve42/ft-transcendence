import { BadRequestException, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { IgdbService } from "src/igdb/igdb.service";
import { SteamGamesService } from "src/steam-games/steam-games.service";
import { GameService } from "./games.service";
import { ExternalGameSource } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { ArrayUnique } from "class-validator";

@Injectable()
export class SteamCatalogSeederService implements OnApplicationBootstrap{
	constructor(
		private readonly igdbService: IgdbService,
		private readonly steamGames: SteamGamesService,
		private readonly gameService: GameService,
		private readonly prisma: PrismaService,
		
	){}
	async onApplicationBootstrap(): Promise<void> {
		await this.seedIfDatabaseIsEmpty(5000);
	}

	/**
	 * Seeds up to `targetCount` canonical multiplayer/co-op games.
	 * We stop only after enough final games were persisted, not after a fixed number of Steam candidates.
	 */
	async seedMostPopularMultiplayerGames(targetCount: number): Promise<number> {
		if (!Number.isInteger(targetCount) || targetCount <= 0)
			throw new BadRequestException("Target count must be a positive integer");
		let processed = 0;
		let offset = 0;
		const seededGameIds = new Set<string>();
		while (processed < targetCount) {
			const mostPlayedGames = await this.igdbService.getPopularMultiplayerGames(500, offset);
			offset += 500;
			if (mostPlayedGames.length === 0) 
				break ;
			for (const mostPlayedGame of mostPlayedGames){
				if (processed >= targetCount)
					break;
				const game = await this.gameService.upsertFromExternal({
					source: ExternalGameSource.IGDB,
					externalId: mostPlayedGame.igdbId,
					externalUrl: null,
					canonicalSlug: mostPlayedGame.name,
					name: mostPlayedGame.name,
					summary: mostPlayedGame.summary,
					coverUrl:mostPlayedGame.coverUrl,
					firstReleaseDate: mostPlayedGame.firstReleaseDate,
				});
			if (seededGameIds.has(game.id))
				continue;
			const sourceTags = [
				...mostPlayedGame.genres,
				...mostPlayedGame.themes,
				...mostPlayedGame.keywords,
			];
			await this.gameService.upsertSourceTagsForGame(
				game.id,
				ExternalGameSource.IGDB,
				sourceTags,
			)
			seededGameIds.add(game.id);
			processed +=1;
		}
		}
		console.info("[SteamCatalogSeederService] seed diagnostics", {
			targetCount,
			processed,
		});
		return processed;
	}
	async seedTagsFromGenres(): Promise<number>{
		const genres = await this.prisma.gameSourceTag.findMany({
			where: { externalTagId: { startsWith: "genre:"} },
			distinct: ["label"],
			select: { label : true },
		});
		let count = 0;
		for (const genre of genres) {
			const slug = genre.label
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
				.trim();
			await this.prisma.tag.upsert({
				where: { slug },
				update: { label: genre.label },
				create: { slug, label: genre.label },
			});
			count++;
		}
		console.info("[SteamCatalogSeederService] seeded tags", { count });
		return count;
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
		const seeded = await this.seedMostPopularMultiplayerGames(limit);
		await this.seedTagsFromGenres();
		return seeded;
	}
	
}
