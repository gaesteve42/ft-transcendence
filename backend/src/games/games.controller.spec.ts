import { GameController } from "./games.controller";
import { GameService } from "./games.service";
import { ExternalGameSource } from "@prisma/client";
import { UpsertExternalGameDto } from "./dto/upsert-external-game.dto";

describe("GameController", () => {
	let controller: GameController;
	let gameService: { upsertFromExternal: jest.Mock };

	beforeEach(() => {
		gameService = {
			upsertFromExternal: jest.fn(),
		};

		controller = new GameController(gameService as unknown as GameService);
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
});
