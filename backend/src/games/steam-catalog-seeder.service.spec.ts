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
	let steamGames: {
		getMostPlayedSteamGames: jest.Mock;
	};
	let igdbService: {
		getGameIdBySteamAppId: jest.Mock;
		getGameDetails: jest.Mock;
	};
	let gameService: {
		upsertFromExternal: jest.Mock;
		findByExternalId: jest.Mock;
		linkExternalId: jest.Mock;
		upsertSourceTagsForGame: jest.Mock;
	};

	beforeEach(() => {
		prisma = {
			gameSourceTag: {
				count: jest.fn(),
			},
		};
		steamGames = {
			getMostPlayedSteamGames: jest.fn(),
		};
		igdbService = {
			getGameIdBySteamAppId: jest.fn(),
			getGameDetails: jest.fn(),
		};
		gameService = {
			upsertFromExternal: jest.fn(),
			findByExternalId: jest.fn(),
			linkExternalId: jest.fn(),
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
		expect(steamGames.getMostPlayedSteamGames).not.toHaveBeenCalled();
	});

	it("keeps scanning Steam Charts candidates until enough final multiplayer games were seeded", async () => {
		steamGames.getMostPlayedSteamGames.mockResolvedValue([
			{ appId: "10" },
			{ appId: "20" },
			{ appId: "30" },
			{ appId: "40" },
		]);
		igdbService.getGameIdBySteamAppId
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce("200")
			.mockResolvedValueOnce("300")
			.mockResolvedValueOnce("400");
		igdbService.getGameDetails
			.mockResolvedValueOnce({
				igdbId: "200",
				name: "Solo Game",
				summary: null,
				coverUrl: null,
				firstReleaseDate: null,
				supportsMultiplayerOrCoop: false,
				genres: [],
				themes: [],
				keywords: [],
				gameModeNames: [],
			})
			.mockResolvedValueOnce({
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
			})
			.mockResolvedValueOnce({
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
			});
		gameService.upsertFromExternal
			.mockResolvedValueOnce({ id: "game-300", name: "Multiplayer Game 1" })
			.mockResolvedValueOnce({ id: "game-400", name: "Multiplayer Game 2" });
		gameService.findByExternalId
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null);

		const result = await service.seedMostPopularMultiplayerGames(2);

		// The seed must continue past rejected candidates until it reaches the target count.
		expect(result).toBe(2);
		expect(steamGames.getMostPlayedSteamGames).toHaveBeenCalled();
		expect(igdbService.getGameIdBySteamAppId).toHaveBeenCalledTimes(4);
		expect(gameService.upsertFromExternal).toHaveBeenCalledTimes(2);
		expect(gameService.linkExternalId).toHaveBeenNthCalledWith(
			1,
			"game-300",
			ExternalGameSource.STEAM,
			"30",
			"https://store.steampowered.com/app/30",
		);
		expect(gameService.linkExternalId).toHaveBeenNthCalledWith(
			2,
			"game-400",
			ExternalGameSource.STEAM,
			"40",
			"https://store.steampowered.com/app/40",
		);
		expect(gameService.upsertSourceTagsForGame).toHaveBeenCalledTimes(2);
	});

	it("does not recreate the Steam mapping when it already exists for the seeded game", async () => {
		steamGames.getMostPlayedSteamGames.mockResolvedValue([{ appId: "10" }]);
		igdbService.getGameIdBySteamAppId.mockResolvedValue("200");
		igdbService.getGameDetails.mockResolvedValue({
			igdbId: "200",
			name: "Multiplayer Game 1",
			summary: "tagged",
			coverUrl: null,
			firstReleaseDate: null,
			supportsMultiplayerOrCoop: true,
			genres: [],
			themes: [],
			keywords: [],
			gameModeNames: ["Multiplayer"],
		});
		gameService.upsertFromExternal.mockResolvedValue({ id: "game-200", name: "Multiplayer Game 1" });
		gameService.findByExternalId.mockResolvedValue({ id: "game-200", name: "Multiplayer Game 1" });

		const result = await service.seedMostPopularMultiplayerGames(1);

		expect(result).toBe(1);
		expect(gameService.linkExternalId).not.toHaveBeenCalled();
		expect(gameService.upsertSourceTagsForGame).toHaveBeenCalledWith(
			"game-200",
			ExternalGameSource.IGDB,
			[],
		);
	});
});
