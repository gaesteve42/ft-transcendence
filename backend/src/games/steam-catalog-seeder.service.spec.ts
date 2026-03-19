import { BadRequestException } from "@nestjs/common";
import { ExternalGameSource } from "@prisma/client";
import { IgdbService } from "src/igdb/igdb.service";
import { PrismaService } from "src/prisma/prisma.service";
import { SteamGamesService } from "src/steam-games/steam-games.service";
import { GameService } from "./games.service";
import { SteamCatalogSeederService } from "./steam-catalog-seeder.service";

describe("SteamCatalogSeederService", () => {
	let service: SteamCatalogSeederService;
	let prisma: {
		gameSourceTag: {
			count: jest.Mock;
		};
	};
	let steamGames: Record<string, never>;
	let igdbService: {
		getPopularMultiplayerGames: jest.Mock;
	};
	let gameService: {
		upsertFromExternal: jest.Mock;
		upsertSourceTagsForGame: jest.Mock;
	};

	beforeEach(() => {
		prisma = {
			gameSourceTag: {
				count: jest.fn(),
			},
		};
		steamGames = {};
		igdbService = {
			getPopularMultiplayerGames: jest.fn(),
		};
		gameService = {
			upsertFromExternal: jest.fn(),
			upsertSourceTagsForGame: jest.fn(),
		};

		service = new SteamCatalogSeederService(
			igdbService as unknown as IgdbService,
			steamGames as unknown as SteamGamesService,
			gameService as unknown as GameService,
			prisma as unknown as PrismaService,
		);
	});

	it("returns 0 when IGDB tags already exist in the catalog", async () => {
		prisma.gameSourceTag.count.mockResolvedValue(1);
		const seedSpy = jest.spyOn(service, "seedMostPopularMultiplayerGames");

		const result = await service.seedIfDatabaseIsEmpty(500);

		expect(result).toBe(0);
		expect(seedSpy).not.toHaveBeenCalled();
	});

	it("delegates to the seeding method when the catalog is not initialized yet", async () => {
		prisma.gameSourceTag.count.mockResolvedValue(0);
		const seedSpy = jest.spyOn(service, "seedMostPopularMultiplayerGames").mockResolvedValue(42);

		const result = await service.seedIfDatabaseIsEmpty(500);

		expect(seedSpy).toHaveBeenCalledWith(500);
		expect(result).toBe(42);
	});

	it("rejects an invalid target count", async () => {
		await expect(service.seedMostPopularMultiplayerGames(0)).rejects.toThrow(
			new BadRequestException("Target count must be a positive integer"),
		);
		expect(igdbService.getPopularMultiplayerGames).not.toHaveBeenCalled();
	});

	it("seeds games from IGDB until the target count is reached", async () => {
		igdbService.getPopularMultiplayerGames.mockResolvedValueOnce([
			{
				igdbId: "300",
				name: "Multiplayer Game 1",
				summary: "tagged",
				coverUrl: null,
				firstReleaseDate: null,
				supportsMultiplayerOrCoop: true,
				genres: [{ externalTagId: "genre:12", label: "Role-playing (RPG)" }],
				themes: [],
				keywords: [],
				gameModeNames: ["Multiplayer"],
			},
			{
				igdbId: "400",
				name: "Multiplayer Game 2",
				summary: "tagged",
				coverUrl: null,
				firstReleaseDate: null,
				supportsMultiplayerOrCoop: true,
				genres: [{ externalTagId: "genre:31", label: "Adventure" }],
				themes: [],
				keywords: [],
				gameModeNames: ["Co-operative"],
			},
		]);
		gameService.upsertFromExternal
			.mockResolvedValueOnce({ id: "game-300", name: "Multiplayer Game 1" })
			.mockResolvedValueOnce({ id: "game-400", name: "Multiplayer Game 2" });

		const result = await service.seedMostPopularMultiplayerGames(2);

		expect(result).toBe(2);
		expect(igdbService.getPopularMultiplayerGames).toHaveBeenCalledWith(500, 0);
		expect(gameService.upsertFromExternal).toHaveBeenCalledTimes(2);
		expect(gameService.upsertSourceTagsForGame).toHaveBeenCalledTimes(2);
		expect(gameService.upsertSourceTagsForGame).toHaveBeenNthCalledWith(
			1,
			"game-300",
			ExternalGameSource.IGDB,
			[{ externalTagId: "genre:12", label: "Role-playing (RPG)" }],
		);
		expect(gameService.upsertSourceTagsForGame).toHaveBeenNthCalledWith(
			2,
			"game-400",
			ExternalGameSource.IGDB,
			[{ externalTagId: "genre:31", label: "Adventure" }],
		);
	});

	it("paginates to the next batch when the first batch is not enough", async () => {
		igdbService.getPopularMultiplayerGames
			.mockResolvedValueOnce([
				{
					igdbId: "100",
					name: "Game A",
					summary: null,
					coverUrl: null,
					firstReleaseDate: null,
					supportsMultiplayerOrCoop: true,
					genres: [],
					themes: [],
					keywords: [],
					gameModeNames: ["Multiplayer"],
				},
			])
			.mockResolvedValueOnce([
				{
					igdbId: "200",
					name: "Game B",
					summary: null,
					coverUrl: null,
					firstReleaseDate: null,
					supportsMultiplayerOrCoop: true,
					genres: [],
					themes: [],
					keywords: [],
					gameModeNames: ["Co-operative"],
				},
			]);
		gameService.upsertFromExternal
			.mockResolvedValueOnce({ id: "game-100", name: "Game A" })
			.mockResolvedValueOnce({ id: "game-200", name: "Game B" });

		const result = await service.seedMostPopularMultiplayerGames(2);

		expect(result).toBe(2);
		expect(igdbService.getPopularMultiplayerGames).toHaveBeenNthCalledWith(1, 500, 0);
		expect(igdbService.getPopularMultiplayerGames).toHaveBeenNthCalledWith(2, 500, 500);
	});

	it("stops when IGDB returns an empty batch", async () => {
		igdbService.getPopularMultiplayerGames.mockResolvedValueOnce([]);

		const result = await service.seedMostPopularMultiplayerGames(500);

		expect(result).toBe(0);
		expect(gameService.upsertFromExternal).not.toHaveBeenCalled();
	});

	it("skips duplicate games already seeded in the same run", async () => {
		igdbService.getPopularMultiplayerGames
			.mockResolvedValueOnce([
				{
					igdbId: "300",
					name: "Same Game",
					summary: null,
					coverUrl: null,
					firstReleaseDate: null,
					supportsMultiplayerOrCoop: true,
					genres: [],
					themes: [],
					keywords: [],
					gameModeNames: ["Multiplayer"],
				},
				{
					igdbId: "300",
					name: "Same Game",
					summary: null,
					coverUrl: null,
					firstReleaseDate: null,
					supportsMultiplayerOrCoop: true,
					genres: [],
					themes: [],
					keywords: [],
					gameModeNames: ["Multiplayer"],
				},
			])
			.mockResolvedValueOnce([]);
		gameService.upsertFromExternal
			.mockResolvedValue({ id: "game-300", name: "Same Game" });

		const result = await service.seedMostPopularMultiplayerGames(10);

		expect(result).toBe(1);
		expect(gameService.upsertSourceTagsForGame).toHaveBeenCalledTimes(1);
	});
});
