import { BadRequestException } from "@nestjs/common";
import { ExternalGameSource } from "@prisma/client";
import { IgdbService } from "src/igdb/igdb.service";
import { PrismaService } from "src/prisma/prisma.service";
import { GameService } from "./games.service";
import { SteamIgdbEnrichmentService } from "./steam-igdb-enrichment.service";

describe("SteamIgdbEnrichmentService", () => {
	let service: SteamIgdbEnrichmentService;
	let prisma: {
		gameExternalId: {
			findMany: jest.Mock;
		};
		userGame: {
			findMany: jest.Mock;
		};
	};
	let igdbService: {
		getGameIdBySteamAppId: jest.Mock;
		getGameDetails: jest.Mock;
	};
	let gameService: {
		linkExternalId: jest.Mock;
		enrichCanonicalGameIfMissing: jest.Mock;
		upsertSourceTagsForGame: jest.Mock;
	};

	beforeEach(() => {
		prisma = {
			gameExternalId: {
				findMany: jest.fn(),
			},
			userGame: {
				findMany: jest.fn(),
			},
		};
		igdbService = {
			getGameIdBySteamAppId: jest.fn(),
			getGameDetails: jest.fn(),
		};
		gameService = {
			linkExternalId: jest.fn(),
			enrichCanonicalGameIfMissing: jest.fn(),
			upsertSourceTagsForGame: jest.fn(),
		};

		service = new SteamIgdbEnrichmentService(
			prisma as unknown as PrismaService,
			igdbService as unknown as IgdbService,
			gameService as unknown as GameService,
		);
	});

	it("rejects a blank user id when searching owned Steam games to enrich", async () => {
		await expect(service.findOwnedSteamGamesNeedingIgdbEnrichment("   ")).rejects.toThrow(
			new BadRequestException("User ID is required"),
		);
		expect(prisma.userGame.findMany).not.toHaveBeenCalled();
	});

	it("returns only owned Steam games that still miss an IGDB mapping", async () => {
		prisma.userGame.findMany.mockResolvedValue([
			{
				userId: "user-1",
				gameId: "game-1",
				owned: true,
				playtimeMinutes: null,
				lastSyncedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				game: {
					id: "game-1",
					externalIds: [
						{
							id: "steam-1",
							gameId: "game-1",
							source: ExternalGameSource.STEAM,
							externalId: "1145360",
							externalUrl: null,
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					],
				},
			},
			{
				userId: "user-1",
				gameId: "game-2",
				owned: true,
				playtimeMinutes: null,
				lastSyncedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				game: {
					id: "game-2",
					externalIds: [
						{
							id: "steam-2",
							gameId: "game-2",
							source: ExternalGameSource.STEAM,
							externalId: "730",
							externalUrl: null,
							createdAt: new Date(),
							updatedAt: new Date(),
						},
						{
							id: "igdb-2",
							gameId: "game-2",
							source: ExternalGameSource.IGDB,
							externalId: "1905",
							externalUrl: null,
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					],
				},
			},
			{
				userId: "user-1",
				gameId: "game-3",
				owned: true,
				playtimeMinutes: null,
				lastSyncedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				game: {
					id: "game-3",
					externalIds: [],
				},
			},
		]);

		const result = await service.findOwnedSteamGamesNeedingIgdbEnrichment("user-1");

		// Only games still mapped from Steam and not yet linked to IGDB should be enriched.
		expect(result).toEqual([
			{
				gameId: "game-1",
				steamAppId: "1145360",
			},
		]);
		expect(prisma.userGame.findMany).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
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
	});

	it("rejects a blank game id when enriching one Steam game", async () => {
		await expect(service.enrichSteamGameFromIgdb("   ", "1145360")).rejects.toThrow(
			new BadRequestException("Game ID is required"),
		);
		expect(igdbService.getGameIdBySteamAppId).not.toHaveBeenCalled();
	});

	it("rejects a blank Steam app id when enriching one Steam game", async () => {
		await expect(service.enrichSteamGameFromIgdb("game-1", "   ")).rejects.toThrow(
			new BadRequestException("App ID is required"),
		);
		expect(igdbService.getGameIdBySteamAppId).not.toHaveBeenCalled();
	});

	it("returns without touching the game when no IGDB mapping exists for the Steam app id", async () => {
		igdbService.getGameIdBySteamAppId.mockResolvedValue(null);

		await service.enrichSteamGameFromIgdb("game-1", "1145360");

		expect(igdbService.getGameIdBySteamAppId).toHaveBeenCalledWith("1145360");
		expect(igdbService.getGameDetails).not.toHaveBeenCalled();
		expect(gameService.linkExternalId).not.toHaveBeenCalled();
		expect(gameService.enrichCanonicalGameIfMissing).not.toHaveBeenCalled();
		expect(gameService.upsertSourceTagsForGame).not.toHaveBeenCalled();
	});

	it("links the IGDB mapping, enriches metadata, and stores IGDB tags for one Steam game", async () => {
		igdbService.getGameIdBySteamAppId.mockResolvedValue("113112");
		igdbService.getGameDetails.mockResolvedValue({
			igdbId: "113112",
			name: "Hades",
			summary: "roguelike",
			coverUrl: "https://images.igdb.test/hades.jpg",
			firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
			genres: [{ externalTagId: "genre:12", label: "Role-playing (RPG)" }],
			themes: [{ externalTagId: "theme:1", label: "Action" }],
			keywords: [{ externalTagId: "keyword:1033", label: "action-adventure" }],
		});

		await service.enrichSteamGameFromIgdb("game-1", "1145360");

		expect(gameService.linkExternalId).toHaveBeenCalledWith(
			"game-1",
			ExternalGameSource.IGDB,
			"113112",
			null,
		);
		expect(gameService.enrichCanonicalGameIfMissing).toHaveBeenCalledWith("game-1", {
			summary: "roguelike",
			coverUrl: "https://images.igdb.test/hades.jpg",
			firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
		});
		expect(gameService.upsertSourceTagsForGame).toHaveBeenCalledWith(
			"game-1",
			ExternalGameSource.IGDB,
			[
				{ externalTagId: "genre:12", label: "Role-playing (RPG)" },
				{ externalTagId: "theme:1", label: "Action" },
				{ externalTagId: "keyword:1033", label: "action-adventure" },
			],
		);
	});

	it("processes each pending owned Steam game sequentially in the batch enrich method", async () => {
		const findSpy = jest
			.spyOn(service, "findOwnedSteamGamesNeedingIgdbEnrichment")
			.mockResolvedValue([
				{ gameId: "game-1", steamAppId: "1145360" },
				{ gameId: "game-2", steamAppId: "730" },
			]);
		const enrichSpy = jest.spyOn(service, "enrichSteamGameFromIgdb").mockResolvedValue();

		const processed = await service.enrichOwnedSteamGamesMissingIgdbData("user-1");

		expect(findSpy).toHaveBeenCalledWith("user-1");
		expect(enrichSpy).toHaveBeenNthCalledWith(1, "game-1", "1145360");
		expect(enrichSpy).toHaveBeenNthCalledWith(2, "game-2", "730");
		expect(processed).toBe(2);
	});
});
