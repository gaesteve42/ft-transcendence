import { GameController } from "./games.controller";
import { GameService } from "./games.service";
import { ExternalGameSource } from "@prisma/client";
import { UpsertExternalGameDto } from "./dto/upsert-external-game.dto";
import { SteamLibraryImportService } from "./steam-library-import.service";
import { IgdbService } from "src/igdb/igdb.service";
import { SteamGamesService } from "src/steam-games/steam-games.service";
import { SteamIgdbEnrichmentService } from "./steam-igdb-enrichment.service";

/**
 * Unit tests for GameController.
 * Verifies that each endpoint correctly delegates to its underlying service
 * and returns the service result without transformation (thin controller pattern).
 */
describe("GameController", () => {
	let controller: GameController;
	let gameService: {
		upsertFromExternal: jest.Mock;
		listOwnedGamesForUser: jest.Mock;
		addOwnedGameForUser: jest.Mock;
		removeOwnedGameForUser: jest.Mock;
	};
	let steamImport: {
		previewImport: jest.Mock;
		previewImportForUser: jest.Mock;
		importLibrary: jest.Mock;
		importLibraryForUser: jest.Mock;
	};
	let igdbService: {
		searchCatalog: jest.Mock;
	};
	let steamGames: {
		getMostPlayedGames: jest.Mock;
	};
	let steamIgdbEnrichment: {
		enrichOwnedSteamGamesMissingIgdbData: jest.Mock;
	};

	beforeEach(() => {
		gameService = {
			upsertFromExternal: jest.fn(),
			listOwnedGamesForUser: jest.fn(),
			addOwnedGameForUser: jest.fn(),
			removeOwnedGameForUser: jest.fn(),
		};
		steamImport = {
			previewImport: jest.fn(),
			previewImportForUser: jest.fn(),
			importLibrary: jest.fn(),
			importLibraryForUser: jest.fn(),
		};
		igdbService = {
			searchCatalog: jest.fn(),
		};
		steamGames = {
			getMostPlayedGames: jest.fn(),
		};
		steamIgdbEnrichment = {
			enrichOwnedSteamGamesMissingIgdbData: jest.fn(),
		};

		controller = new GameController(
			gameService as unknown as GameService,
			steamImport as unknown as SteamLibraryImportService,
			igdbService as unknown as IgdbService,
			steamGames as unknown as SteamGamesService,
			steamIgdbEnrichment as unknown as SteamIgdbEnrichmentService,
		);
	});

	// Delegates popular games retrieval to SteamGamesService.
	it("should call getMostPlayedGames and return popular games", async () => {
		const popular = [
			{
				appId: "730",
				name: "Counter-Strike 2",
				headerImage: "https://cdn.example.test/730.jpg",
			},
		];
		steamGames.getMostPlayedGames.mockResolvedValue(popular);

		const result = await controller.getPopularGames();

		expect(steamGames.getMostPlayedGames).toHaveBeenCalled();
		expect(result).toEqual(popular);
	});

	// Verifies that the DTO's ISO string date is converted to a Date before delegation.
	it("should call upsertFromExternal with a converted Date", async () => {
		const dto: UpsertExternalGameDto = {
			source: ExternalGameSource.STEAM,
			externalId: "1145360",
			externalUrl: "https://store.steampowered.com/app/1145360",
			canonicalSlug: "hades",
			name: "Hades",
			summary: "roguelike",
			coverUrl: "https://example.com/hades.jpg",
			firstReleaseDate: "2020-09-17T00:00:00.000Z",
		};

		const serviceResult = {
			id: "game-1",
			canonicalSlug: "hades",
			name: "Hades",
			summary: "roguelike",
			coverUrl: "https://example.com/hades.jpg",
			firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-02T00:00:00.000Z"),
		};

		gameService.upsertFromExternal.mockResolvedValue(serviceResult);

		const result = await controller.upsert(dto);

		expect(gameService.upsertFromExternal).toHaveBeenCalledWith({
			source: ExternalGameSource.STEAM,
			externalId: "1145360",
			externalUrl: "https://store.steampowered.com/app/1145360",
			canonicalSlug: "hades",
			name: "Hades",
			summary: "roguelike",
			coverUrl: "https://example.com/hades.jpg",
			firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
		});
		expect(result).toEqual(serviceResult);
	});

	// Verifies null optional fields are forwarded as-is to the service.
	it("should pass null when firstReleaseDate is null", async () => {
		const dto: UpsertExternalGameDto = {
			source: ExternalGameSource.IGDB,
			externalId: "12345",
			externalUrl: null,
			canonicalSlug: "hades",
			name: "Hades",
			summary: null,
			coverUrl: null,
			firstReleaseDate: null,
		};

		const serviceResult = {
			id: "game-2",
			canonicalSlug: "hades",
			name: "Hades",
			summary: null,
			coverUrl: null,
			firstReleaseDate: null,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-02T00:00:00.000Z"),
		};

		gameService.upsertFromExternal.mockResolvedValue(serviceResult);

		await controller.upsert(dto);

		expect(gameService.upsertFromExternal).toHaveBeenCalledWith({
			source: ExternalGameSource.IGDB,
			externalId: "12345",
			externalUrl: null,
			canonicalSlug: "hades",
			name: "Hades",
			summary: null,
			coverUrl: null,
			firstReleaseDate: null,
		});
	});

	// Verifies the controller returns the service result by reference, not a copy.
	it("should return the service result", async () => {
		const dto: UpsertExternalGameDto = {
			source: ExternalGameSource.STEAM,
			externalId: "1145360",
			externalUrl: null,
			canonicalSlug: "hades",
			name: "Hades",
			summary: null,
			coverUrl: null,
			firstReleaseDate: null,
		};

		const serviceResult = {
			id: "game-3",
			canonicalSlug: "hades",
			name: "Hades",
			summary: null,
			coverUrl: null,
			firstReleaseDate: null,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-02T00:00:00.000Z"),
		};

		gameService.upsertFromExternal.mockResolvedValue(serviceResult);

		const result = await controller.upsert(dto);

		expect(result).toBe(serviceResult);
	});

	// Verifies that service-layer exceptions bubble up unchanged.
	it("should propagate service errors", async () => {
		const dto: UpsertExternalGameDto = {
			source: ExternalGameSource.STEAM,
			externalId: "1145360",
			externalUrl: null,
			canonicalSlug: "hades",
			name: "Hades",
			summary: null,
			coverUrl: null,
			firstReleaseDate: null,
		};

		const error = new Error("service failure");
		gameService.upsertFromExternal.mockRejectedValue(error);

		await expect(controller.upsert(dto)).rejects.toThrow(error);
	});

	it("should call previewImport with steamId and return the preview result", async () => {
		// Cette route historique prend encore un steamId dans l'URL.
		// Le contrôleur ne transforme rien : il délègue simplement au service.
		const preview = {
			steamId: "76561198000000000",
			fetchedAt: new Date("2026-03-05T10:00:00.000Z"),
			totalGames: 2,
			recentlyActiveGames: 1,
			games: [
				{
					appId: "10",
					name: "Counter-Strike",
					playtimeMinutesForever: 1200,
					playtimeMinutesLast2Weeks: 45,
					iconUrl: null,
				},
			],
		};
		steamImport.previewImport.mockResolvedValue(preview);

		const result = await controller.previewSteamImport("76561198000000000");

		expect(steamImport.previewImport).toHaveBeenCalledWith("76561198000000000");
		expect(result).toEqual(preview);
	});

	// Verifies that preview service errors bubble up unchanged.
	it("should propagate preview import errors", async () => {
		const error = new Error("preview failed");
		steamImport.previewImport.mockRejectedValue(error);

		await expect(controller.previewSteamImport("76561198000000000")).rejects.toThrow(error);
	});

	it("should call previewImportForUser with current user id", async () => {
		// Cette route est la version sécurisée du flux preview :
		// on part du user connecté, puis le service résout son steamId.
		const preview = {
			steamId: "76561198000000000",
			fetchedAt: new Date("2026-03-06T10:00:00.000Z"),
			totalGames: 2,
			recentlyActiveGames: 1,
			games: [
				{
					appId: "10",
					name: "Counter-Strike",
					playtimeMinutesForever: 1200,
					playtimeMinutesLast2Weeks: 45,
					iconUrl: null,
				},
			],
		};
		steamImport.previewImportForUser.mockResolvedValue(preview);

		const result = await controller.previewMySteamImport("user-1");

		expect(steamImport.previewImportForUser).toHaveBeenCalledWith("user-1");
		expect(result).toEqual(preview);
	});

	it("should call importLibrary with steamId and return the import result", async () => {
		// Même logique que pour previewSteamImport, mais appliquée à l'import.
		const resultPayload = {
			steamId: "76561198000000000",
			userId: "user-1",
			importedAt: new Date("2026-03-05T10:00:00.000Z"),
			totalFetched: 2,
			createdCanonicalGames: 1,
			linkedUserGames: 2,
			updatedUserGames: 0,
		};
		steamImport.importLibrary.mockResolvedValue(resultPayload);

		const result = await controller.importSteamLibrary("76561198000000000");

		expect(steamImport.importLibrary).toHaveBeenCalledWith("76561198000000000");
		expect(result).toEqual(resultPayload);
	});

	// Verifies that import service errors bubble up unchanged.
	it("should propagate import errors", async () => {
		const error = new Error("import failed");
		steamImport.importLibrary.mockRejectedValue(error);

		await expect(controller.importSteamLibrary("76561198000000000")).rejects.toThrow(error);
	});

	it("should call importLibraryForUser with current user id", async () => {
		// Cette route /import/me évite de faire confiance à un steamId fourni par le client.
		const resultPayload = {
			steamId: "76561198000000000",
			userId: "user-1",
			importedAt: new Date("2026-03-05T10:00:00.000Z"),
			totalFetched: 2,
			createdCanonicalGames: 1,
			linkedUserGames: 2,
			updatedUserGames: 0,
		};
		steamImport.importLibraryForUser.mockResolvedValue(resultPayload);

		const result = await controller.importMySteamLibrary("user-1");

		expect(steamImport.importLibraryForUser).toHaveBeenCalledWith("user-1");
		expect(result).toEqual(resultPayload);
	});

	// Verifies the default limit of 10 is applied when the caller omits the limit param.
	it("should call searchCatalog with default limit when no limit is provided", async () => {
		const catalog = [
			{
				igdbId: "113112",
				name: "Hades",
				summary: "rogue-like",
				coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/cob9kr.jpg",
				firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
			},
		];
		igdbService.searchCatalog.mockResolvedValue(catalog);

		const result = await controller.searchCatalog({ query: "hades" });

		expect(igdbService.searchCatalog).toHaveBeenCalledWith("hades", 10);
		expect(result).toEqual(catalog);
	});

	// Verifies an explicit limit is forwarded to the IGDB service.
	it("should call searchCatalog with the provided limit", async () => {
		igdbService.searchCatalog.mockResolvedValue([]);

		await controller.searchCatalog({ query: "hades", limit: 5 });

		expect(igdbService.searchCatalog).toHaveBeenCalledWith("hades", 5);
	});

	// Delegates library listing to GameService with the authenticated user's ID.
	it("should call listOwnedGamesForUser with the authenticated user id", async () => {
		const library = [
			{
				gameId: "game-1",
				igdbId: "113112",
				name: "Hades",
				summary: "rogue-like",
				coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/cob9kr.jpg",
				firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
				owned: true as const,
				playtimeMinutes: null,
				lastSyncedAt: null,
			},
		];
		gameService.listOwnedGamesForUser.mockResolvedValue(library);

		const result = await controller.listMyLibrary("user-1");

		expect(gameService.listOwnedGamesForUser).toHaveBeenCalledWith("user-1");
		expect(result).toEqual(library);
	});

	// Delegates game addition to GameService with user ID and IGDB ID from the request body.
	it("should call addOwnedGameForUser with the authenticated user id and igdb id", async () => {
		const payload = {
			gameId: "game-1",
			igdbId: "113112",
			name: "Hades",
			owned: true as const,
		};
		gameService.addOwnedGameForUser.mockResolvedValue(payload);

		const result = await controller.addOwnedGame("user-1", { igdbId: "113112" });

		expect(gameService.addOwnedGameForUser).toHaveBeenCalledWith("user-1", "113112");
		expect(result).toEqual(payload);
	});

	// Delegates game removal to GameService with user ID and game ID from the route param.
	it("should call removeOwnedGameForUser with the authenticated user id and game id", async () => {
		const payload = {
			gameId: "game-1",
			removed: true as const,
		};
		gameService.removeOwnedGameForUser.mockResolvedValue(payload);

		const result = await controller.removeOwnedGame("user-1", "game-1");

		expect(gameService.removeOwnedGameForUser).toHaveBeenCalledWith("user-1", "game-1");
		expect(result).toEqual(payload);
	});

	// Delegates IGDB enrichment to SteamIgdbEnrichmentService and wraps the count in an object.
	it("should call enrichOwnedSteamGamesMissingIgdbData and return the number of processed games", async () => {
		steamIgdbEnrichment.enrichOwnedSteamGamesMissingIgdbData.mockResolvedValue(9);

		const result = await controller.enrichMySteamGamesWithIgdb("user-1");

		expect(steamIgdbEnrichment.enrichOwnedSteamGamesMissingIgdbData).toHaveBeenCalledWith("user-1");
		expect(result).toEqual({ processed: 9 });
	});
});
