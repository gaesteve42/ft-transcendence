import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SteamGamesService } from "./steam-games.service";

type MockResponse = {
	ok: boolean;
	json: jest.Mock<Promise<unknown>, []>;
};

/**
 * Unit tests for SteamGamesService.
 * Validates Steam Web API integration: input sanitization, HTTP error handling,
 * and normalization of the owned-games + recently-played merge flow.
 */
describe("SteamGamesService", () => {
	let service: SteamGamesService;
	let configService: { get: jest.Mock };
	let fetchMock: jest.Mock;

	const makeResponse = (ok: boolean, body: unknown): MockResponse => ({
		ok,
		json: jest.fn().mockResolvedValue(body),
	});

	beforeEach(() => {
		configService = {
			get: jest.fn(),
		};

		service = new SteamGamesService(configService as unknown as ConfigService);

		fetchMock = jest.fn();
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	// Input validation: refuse blank/whitespace steamId before any external call.
	it("throws BadRequestException when steamId is empty after trim", async () => {
		await expect(service.getOwnedGames("   ")).rejects.toThrow(BadRequestException);
		expect(configService.get).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	// Config validation: without API key the service must fail fast.
	it("throws BadRequestException when STEAM_API_KEY is missing", async () => {
		configService.get.mockReturnValue(undefined);

		await expect(service.getOwnedGames("76561198000000000")).rejects.toThrow(BadRequestException);
		expect(configService.get).toHaveBeenCalledWith("STEAM_API_KEY");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	// Upstream error handling: owned-games endpoint failure should be surfaced clearly.
	it("throws when GetOwnedGames HTTP response is not ok", async () => {
		configService.get.mockReturnValue("steam-api-key");
		fetchMock.mockResolvedValueOnce(makeResponse(false, {}));

		await expect(service.getOwnedGames("76561198000000000")).rejects.toThrow("Couldn't export owned games");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	// Upstream error handling: recently-played endpoint failure should fail the whole merge flow.
	it("throws when GetRecentlyPlayedGames HTTP response is not ok", async () => {
		configService.get.mockReturnValue("steam-api-key");
		fetchMock
			.mockResolvedValueOnce(makeResponse(true, {
				response: {
					games: [],
				},
			}))
			.mockResolvedValueOnce(makeResponse(false, {}));

		await expect(service.getOwnedGames("76561198000000000")).rejects.toThrow("Couldn't export recently played games");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	// Happy path: verify normalization + merge by appid + fallback to 0 when recent playtime is missing.
	it("returns normalized games and merges recent playtime by appid", async () => {
		configService.get.mockReturnValue("steam-api-key");

		fetchMock
			.mockResolvedValueOnce(makeResponse(true, {
				response: {
					games: [
						{ appid: 10, name: "Counter-Strike", playtime_forever: 1200, img_icon_url: "icon-a" },
						{ appid: 20, name: "Portal 2", playtime_forever: 300, img_icon_url: "icon-b" },
					],
					game_count: 2,
				},
			}))
			.mockResolvedValueOnce(makeResponse(true, {
				response: {
					games: [
						{ appid: 10, playtime_2weeks: 45 },
					],
				},
			}));

		const result = await service.getOwnedGames("76561198000000000");

		expect(result).toEqual([
			{
				appId: "10",
				name: "Counter-Strike",
				playtimeMinutesForever: 1200,
				playtimeMinutesLast2Weeks: 45,
				iconUrl: "https://media.steampowered.com/steamcommunity/public/images/apps/10/icon-a.jpg",
			},
			{
				appId: "20",
				name: "Portal 2",
				playtimeMinutesForever: 300,
				playtimeMinutesLast2Weeks: 0,
				iconUrl: "https://media.steampowered.com/steamcommunity/public/images/apps/20/icon-b.jpg",
			},
		]);

		expect(fetchMock).toHaveBeenCalledTimes(2);

		const firstUrl = fetchMock.mock.calls[0][0] as URL;
		const secondUrl = fetchMock.mock.calls[1][0] as URL;

		expect(firstUrl.toString()).toContain("GetOwnedGames");
		expect(firstUrl.toString()).toContain("key=steam-api-key");
		expect(firstUrl.toString()).toContain("steamid=76561198000000000");
		expect(firstUrl.toString()).toContain("include_appinfo=true");

		expect(secondUrl.toString()).toContain("GetRecentlyPlayedGames");
		expect(secondUrl.toString()).toContain("key=steam-api-key");
		expect(secondUrl.toString()).toContain("steamid=76561198000000000");
	});

	// Defensive payload parsing: missing `response.games` should degrade to an empty result, not crash.
	it("returns an empty array when Steam payload has no games arrays", async () => {
		configService.get.mockReturnValue("steam-api-key");
		fetchMock
			.mockResolvedValueOnce(makeResponse(true, { response: {} }))
			.mockResolvedValueOnce(makeResponse(true, { response: {} }));

		const result = await service.getOwnedGames("76561198000000000");

		expect(result).toEqual([]);
	});

	// Icon mapping fallback: missing icon hash must produce `iconUrl: null` (never undefined).
	it("sets iconUrl to null when Steam icon hash is missing", async () => {
		configService.get.mockReturnValue("steam-api-key");
		fetchMock
			.mockResolvedValueOnce(makeResponse(true, {
				response: {
					games: [{ appid: 10, name: "Counter-Strike", playtime_forever: 1200 }],
				},
			}))
			.mockResolvedValueOnce(makeResponse(true, {
				response: {
					games: [{ appid: 10, playtime_2weeks: 45 }],
				},
			}));

		const result = await service.getOwnedGames("76561198000000000");

		expect(result).toEqual([
			{
				appId: "10",
				name: "Counter-Strike",
				playtimeMinutesForever: 1200,
				playtimeMinutesLast2Weeks: 45,
				iconUrl: null,
			},
		]);
	});

	// Verify that getMostPlayedSteamGames fetches the Steam Charts endpoint and returns normalized appIds.
	it("returns the raw Steam Charts app ids without applying a seed-specific limit", async () => {
		fetchMock.mockResolvedValueOnce(makeResponse(true, {
			response: {
				ranks: [
					{ appid: 10 },
					{ appid: 20 },
					{ appid: 30 },
				],
			},
		}));

		const result = await service.getMostPlayedSteamGames();

		expect(result).toEqual([
			{ appId: "10" },
			{ appId: "20" },
			{ appId: "30" },
		]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toBe("https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/");
	});
});
