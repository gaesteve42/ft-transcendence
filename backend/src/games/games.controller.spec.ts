import { GameController } from "./games.controller";
import { GameService } from "./games.service";
import { ExternalGameSource } from "@prisma/client";
import { UpsertExternalGameDto } from "./dto/upsert-external-game.dto";
import { SteamLibraryImportService } from "./steam-library-import.service";

describe("GameController", () => {
	let controller: GameController;
	let gameService: { upsertFromExternal: jest.Mock };
	let steamImport: { previewImport: jest.Mock };

	beforeEach(() => {
		gameService = {
			upsertFromExternal: jest.fn(),
		};
		steamImport = {
			previewImport: jest.fn(),
		};

		controller = new GameController(
			gameService as unknown as GameService,
			steamImport as unknown as SteamLibraryImportService,
		);
	});

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

	it("should propagate preview import errors", async () => {
		const error = new Error("preview failed");
		steamImport.previewImport.mockRejectedValue(error);

		await expect(controller.previewSteamImport("76561198000000000")).rejects.toThrow(error);
	});
});
