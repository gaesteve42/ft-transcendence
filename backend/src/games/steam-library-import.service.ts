import { Injectable } from "@nestjs/common";
import { SteamGamesService } from "src/steam-games/steam-games.service";
import { SteamOwnedGame } from "src/steam-games/types/steam-owned-game";

export type SteamLibraryImportPreview = {
	steamId: string;
	fetchedAt: Date;
	totalGames: number;
	recentlyActiveGames: number;
	games: SteamOwnedGame[];
};

@Injectable()
export class SteamLibraryImportService {
	constructor(private readonly steamGames: SteamGamesService) {}

	/**
	 * Orchestrates Steam library retrieval for import workflows.
	 * This method is intentionally read-only for now (no DB persistence).
	 */
	async previewImport(steamId: string): Promise<SteamLibraryImportPreview> {
		const games = await this.steamGames.getOwnedGames(steamId);
		const recentlyActiveGames = games.filter((game) => game.playtimeMinutesLast2Weeks > 0).length;

		return {
			steamId,
			fetchedAt: new Date(),
			totalGames: games.length,
			recentlyActiveGames,
			games,
		};
	}
}
