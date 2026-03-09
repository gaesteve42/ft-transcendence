import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { SteamGamesService } from "src/steam-games/steam-games.service";
import { SteamOwnedGame } from "src/steam-games/types/steam-owned-game";
import { ExternalGameSource } from "@prisma/client";
import { GameService } from "./games.service";
import { PrismaService } from "src/prisma/prisma.service";

export type SteamLibraryImportPreview = {
	steamId: string;
	fetchedAt: Date;
	totalGames: number;
	recentlyActiveGames: number;
	games: SteamOwnedGame[];
};

export type SteamLibraryImportResult = {
	steamId: string;
	userId: string;
	importedAt: Date;
	totalFetched: number;
	createdCanonicalGames: number;
	linkedUserGames: number;
	updatedUserGames: number;
};

@Injectable()
export class SteamLibraryImportService {
	constructor(
		private readonly steamGames: SteamGamesService,
		private readonly gameService: GameService,
		private readonly prisma: PrismaService,
	) {}

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

	/**
	 * Imports a Steam library for a linked user into canonical catalog + UserGame.
	 */
	async importLibrary(steamId: string): Promise<SteamLibraryImportResult> {
		const cleanSteamId = steamId.trim();
		if (cleanSteamId.length === 0)
			throw new BadRequestException("Steam ID is empty");

		const user = await this.prisma.user.findUnique({
			where: { steamId: cleanSteamId },
			select: { id: true },
		});
		if (!user)
			throw new NotFoundException("No linked user found for this Steam ID");

		const games = await this.steamGames.getOwnedGames(cleanSteamId);
		let createdCanonicalGames = 0;
		let linkedUserGames = 0;
		let updatedUserGames = 0;

		for (const ownedGame of games) {
			const existingCanonical = await this.gameService.findByExternalId(
				ExternalGameSource.STEAM,
				ownedGame.appId,
			);
			if (!existingCanonical)
				createdCanonicalGames += 1;

			const canonical = await this.gameService.upsertFromExternal({
				source: ExternalGameSource.STEAM,
				externalId: ownedGame.appId,
				externalUrl: `https://store.steampowered.com/app/${ownedGame.appId}`,
				canonicalSlug: ownedGame.name,
				name: ownedGame.name,
				summary: null,
				coverUrl: ownedGame.iconUrl,
				firstReleaseDate: null,
			});

			const existingUserGame = await this.prisma.userGame.findUnique({
				where: {
					userId_gameId: {
						userId: user.id,
						gameId: canonical.id,
					},
				},
				select: { userId: true },
			});

			await this.prisma.userGame.upsert({
				where: {
					userId_gameId: {
						userId: user.id,
						gameId: canonical.id,
					},
				},
				create: {
					userId: user.id,
					gameId: canonical.id,
					owned: true,
					playtimeMinutes: ownedGame.playtimeMinutesForever,
					lastSyncedAt: new Date(),
				},
				update: {
					owned: true,
					playtimeMinutes: ownedGame.playtimeMinutesForever,
					lastSyncedAt: new Date(),
				},
			});

			if (existingUserGame)
				updatedUserGames += 1;
			else
				linkedUserGames += 1;
		}

		return {
			steamId: cleanSteamId,
			userId: user.id,
			importedAt: new Date(),
			totalFetched: games.length,
			createdCanonicalGames,
			linkedUserGames,
			updatedUserGames,
		};
	}

	/**
	 * Imports using an authenticated internal user id.
	 */
	async importLibraryForUser(userId: string): Promise<SteamLibraryImportResult> {
		const cleanUserId = userId.trim();
		if (cleanUserId.length === 0)
			throw new BadRequestException("User ID is empty");

		const user = await this.prisma.user.findUnique({
			where: { id: cleanUserId },
			select: { steamId: true },
		});
		if (!user)
			throw new NotFoundException("User not found");
		if (!user.steamId)
			throw new BadRequestException("No Steam account linked to this user");

		return this.importLibrary(user.steamId);
	}
	async previewImportForUser(userId: string): Promise<SteamLibraryImportPreview>{
		const cleanUserId = userId.trim();
		if (cleanUserId.length === 0)
			throw new BadRequestException("User ID is empty");
		const user = await this.prisma.user.findUnique({
			where: { id: cleanUserId },
			select: { steamId: true },
		});
		if (!user)
			throw new NotFoundException("User not found");
		if (!user.steamId)
			throw new BadRequestException("No Steam account linked to this user");
		return this.previewImport(user.steamId);
	}
}
