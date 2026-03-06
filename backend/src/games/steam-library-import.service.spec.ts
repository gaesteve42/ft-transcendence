import { SteamLibraryImportService } from "./steam-library-import.service";
import { SteamGamesService } from "src/steam-games/steam-games.service";
import { GameService } from "./games.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("SteamLibraryImportService", () => {
	let service: SteamLibraryImportService;
	let steamGames: { getOwnedGames: jest.Mock };
	let gameService: { findByExternalId: jest.Mock; upsertFromExternal: jest.Mock };
	let prisma: { user: { findUnique: jest.Mock }; userGame: { findUnique: jest.Mock; upsert: jest.Mock } };

	beforeEach(() => {
		steamGames = {
			getOwnedGames: jest.fn(),
		};
		gameService = {
			findByExternalId: jest.fn(),
			upsertFromExternal: jest.fn(),
		};
		prisma = {
			user: {
				findUnique: jest.fn(),
			},
			userGame: {
				findUnique: jest.fn(),
				upsert: jest.fn(),
			},
		};
		service = new SteamLibraryImportService(
			steamGames as unknown as SteamGamesService,
			gameService as unknown as GameService,
			prisma as unknown as PrismaService,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("builds preview stats from owned games", async () => {
		steamGames.getOwnedGames.mockResolvedValue([
			{
				appId: "10",
				name: "Counter-Strike",
				playtimeMinutesForever: 1200,
				playtimeMinutesLast2Weeks: 45,
				iconUrl: null,
			},
			{
				appId: "20",
				name: "Portal 2",
				playtimeMinutesForever: 300,
				playtimeMinutesLast2Weeks: 0,
				iconUrl: null,
			},
		]);

		const result = await service.previewImport("76561198000000000");

		expect(steamGames.getOwnedGames).toHaveBeenCalledWith("76561198000000000");
		expect(result.steamId).toBe("76561198000000000");
		expect(result.totalGames).toBe(2);
		expect(result.recentlyActiveGames).toBe(1);
		expect(result.games).toHaveLength(2);
		expect(result.fetchedAt).toBeInstanceOf(Date);
	});

	it("returns zero stats when no games are returned", async () => {
		steamGames.getOwnedGames.mockResolvedValue([]);

		const result = await service.previewImport("76561198000000000");

		expect(result.totalGames).toBe(0);
		expect(result.recentlyActiveGames).toBe(0);
		expect(result.games).toEqual([]);
	});

	it("importLibraryForUser rejects empty userId", async () => {
		await expect(service.importLibraryForUser("   ")).rejects.toThrow(BadRequestException);
	});

	it("importLibraryForUser rejects unknown user", async () => {
		prisma.user.findUnique.mockResolvedValue(null);

		await expect(service.importLibraryForUser("user-1")).rejects.toThrow(NotFoundException);
	});

	it("importLibraryForUser rejects user without linked steam account", async () => {
		prisma.user.findUnique.mockResolvedValue({ steamId: null });

		await expect(service.importLibraryForUser("user-1")).rejects.toThrow(BadRequestException);
	});

	it("importLibraryForUser delegates to importLibrary with linked steamId", async () => {
		prisma.user.findUnique.mockResolvedValue({ steamId: "76561198000000000" });
		const importSpy = jest.spyOn(service, "importLibrary").mockResolvedValue({
			steamId: "76561198000000000",
			userId: "user-1",
			importedAt: new Date("2026-03-06T10:00:00.000Z"),
			totalFetched: 1,
			createdCanonicalGames: 1,
			linkedUserGames: 1,
			updatedUserGames: 0,
		});

		const result = await service.importLibraryForUser("user-1");

		expect(importSpy).toHaveBeenCalledWith("76561198000000000");
		expect(result.userId).toBe("user-1");
	});
});
