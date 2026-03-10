import { BadRequestException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IgdbService } from "./igdb.service";

type MockResponse = {
	ok: boolean;
	json: jest.Mock<Promise<unknown>, []>;
};

describe("IgdbService", () => {
	let service: IgdbService;
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

		service = new IgdbService(configService as unknown as ConfigService);

		fetchMock = jest.fn();
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("searchCatalog", () => {
		// Input validation must fail before any config lookup or external call.
		it("rejects a blank query after trim", async () => {
			await expect(service.searchCatalog("   ", 10)).rejects.toThrow(BadRequestException);
			expect(configService.get).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
		});

		// The service owns the contract: limit must remain an integer in the agreed range.
		it("rejects an invalid limit", async () => {
			await expect(service.searchCatalog("Hades", 0)).rejects.toThrow(BadRequestException);
			await expect(service.searchCatalog("Hades", 26)).rejects.toThrow(BadRequestException);
			await expect(service.searchCatalog("Hades", 1.5)).rejects.toThrow(BadRequestException);
			expect(configService.get).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
		});

		// Config errors come from the server, not from the caller.
		it("fails fast when Twitch credentials are missing", async () => {
			configService.get.mockReturnValue(undefined);

			await expect(service.searchCatalog("Hades", 10)).rejects.toThrow(InternalServerErrorException);
			expect(configService.get).toHaveBeenCalledWith("TWITCH_CLIENT_ID");
			expect(configService.get).toHaveBeenCalledWith("TWITCH_CLIENT_SECRET");
			expect(fetchMock).not.toHaveBeenCalled();
		});

		// If IGDB stops returning an array for a search, the service must surface it as an upstream format error.
		it("rejects when the IGDB catalog response is not an array", async () => {
			configService.get.mockImplementation((key: string) => {
				if (key === "TWITCH_CLIENT_ID")
					return "twitch-client-id";
				if (key === "TWITCH_CLIENT_SECRET")
					return "twitch-client-secret";
				return undefined;
			});

			fetchMock
				.mockResolvedValueOnce(makeResponse(true, {
					access_token: "igdb-token",
					expires_in: 3600,
					token_type: "bearer",
				}))
				.mockResolvedValueOnce(makeResponse(true, {
					not: "an-array",
				}));

			await expect(service.searchCatalog("Hades", 10)).rejects.toThrow("IGDB catalog response is not an array");
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});

		// Happy path: verify transport + mapping of optional fields into the internal catalog shape.
		it("returns normalized catalog games from IGDB", async () => {
			configService.get.mockImplementation((key: string) => {
				if (key === "TWITCH_CLIENT_ID")
					return "twitch-client-id";
				if (key === "TWITCH_CLIENT_SECRET")
					return "twitch-client-secret";
				return undefined;
			});

			fetchMock
				.mockResolvedValueOnce(makeResponse(true, {
					access_token: "igdb-token",
					expires_in: 3600,
					token_type: "bearer",
				}))
				.mockResolvedValueOnce(makeResponse(true, [
					{
						id: 123,
						name: "Hades",
						summary: "Escape the Underworld.",
						first_release_date: 1600300800,
						cover: {
							image_id: "co1abc",
						},
					},
					{
						id: 456,
						name: "Slay the Spire",
					},
				]));

			const result = await service.searchCatalog("Hades", 10);

			expect(result).toEqual([
				{
					igdbId: "123",
					name: "Hades",
					summary: "Escape the Underworld.",
					coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg",
					firstReleaseDate: new Date(1600300800 * 1000),
				},
				{
					igdbId: "456",
					name: "Slay the Spire",
					summary: null,
					coverUrl: null,
					firstReleaseDate: null,
				},
			]);

			expect(fetchMock).toHaveBeenCalledTimes(2);

			const twitchUrl = fetchMock.mock.calls[0][0] as string;
			const twitchOptions = fetchMock.mock.calls[0][1] as { method: string };
			const igdbUrl = fetchMock.mock.calls[1][0] as string;
			const igdbOptions = fetchMock.mock.calls[1][1] as {
				method: string;
				headers: Record<string, string>;
				body: string;
			};

			expect(twitchUrl).toContain("https://id.twitch.tv/oauth2/token");
			expect(twitchUrl).toContain("client_id=twitch-client-id");
			expect(twitchUrl).toContain("grant_type=client_credentials");
			expect(twitchOptions.method).toBe("POST");

			expect(igdbUrl).toBe("https://api.igdb.com/v4/games");
			expect(igdbOptions.method).toBe("POST");
			expect(igdbOptions.headers["Client-ID"]).toBe("twitch-client-id");
			expect(igdbOptions.headers["Authorization"]).toBe("Bearer igdb-token");
			expect(igdbOptions.headers["Accept"]).toBe("application/json");
			expect(igdbOptions.body).toContain("fields id, name, summary, cover.image_id, first_release_date;");
			expect(igdbOptions.body).toMatch(/search\s+"Hades";/);
			expect(igdbOptions.body).toContain("limit 10;");
		});

		// Token caching is part of the service contract: a second IGDB call should reuse the in-memory token.
		it("reuses the cached Twitch token across multiple catalog searches", async () => {
			configService.get.mockImplementation((key: string) => {
				if (key === "TWITCH_CLIENT_ID")
					return "twitch-client-id";
				if (key === "TWITCH_CLIENT_SECRET")
					return "twitch-client-secret";
				return undefined;
			});

			fetchMock
				.mockResolvedValueOnce(makeResponse(true, {
					access_token: "cached-token",
					expires_in: 3600,
					token_type: "bearer",
				}))
				.mockResolvedValueOnce(makeResponse(true, []))
				.mockResolvedValueOnce(makeResponse(true, []));

			await service.searchCatalog("Hades", 10);
			await service.searchCatalog("Dead Cells", 10);

			expect(fetchMock).toHaveBeenCalledTimes(3);
			expect((fetchMock.mock.calls[0][0] as string)).toContain("https://id.twitch.tv/oauth2/token");
			expect((fetchMock.mock.calls[1][0] as string)).toBe("https://api.igdb.com/v4/games");
			expect((fetchMock.mock.calls[2][0] as string)).toBe("https://api.igdb.com/v4/games");
		});
	});

	describe("getGameDetails", () => {
		it("rejects a blank IGDB ID after trim", async () => {
			await expect(service.getGameDetails("   ")).rejects.toThrow(BadRequestException);
			expect(configService.get).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("rejects a non-positive or non-integer IGDB ID", async () => {
			await expect(service.getGameDetails("abc")).rejects.toThrow(BadRequestException);
			await expect(service.getGameDetails("0")).rejects.toThrow(BadRequestException);
			await expect(service.getGameDetails("-4")).rejects.toThrow(BadRequestException);
			expect(configService.get).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
		});

		// The details endpoint must also guard against upstream shape changes.
		it("rejects when the IGDB details response is not an array", async () => {
			configService.get.mockImplementation((key: string) => {
				if (key === "TWITCH_CLIENT_ID")
					return "twitch-client-id";
				if (key === "TWITCH_CLIENT_SECRET")
					return "twitch-client-secret";
				return undefined;
			});

			fetchMock
				.mockResolvedValueOnce(makeResponse(true, {
					access_token: "igdb-token",
					expires_in: 3600,
					token_type: "bearer",
				}))
				.mockResolvedValueOnce(makeResponse(true, {
					not: "an-array",
				}));

			await expect(service.getGameDetails("123")).rejects.toThrow("IGDB game details response is not an array");
		});

		it("returns NotFoundException when IGDB returns no matching game", async () => {
			configService.get.mockImplementation((key: string) => {
				if (key === "TWITCH_CLIENT_ID")
					return "twitch-client-id";
				if (key === "TWITCH_CLIENT_SECRET")
					return "twitch-client-secret";
				return undefined;
			});

			fetchMock
				.mockResolvedValueOnce(makeResponse(true, {
					access_token: "igdb-token",
					expires_in: 3600,
					token_type: "bearer",
				}))
				.mockResolvedValueOnce(makeResponse(true, []));

			await expect(service.getGameDetails("123")).rejects.toThrow("IGDB game not found");
		});

		// Happy path: verify full mapping, including nested tags and cover URL construction.
		it("returns normalized game details with genres, themes and keywords", async () => {
			configService.get.mockImplementation((key: string) => {
				if (key === "TWITCH_CLIENT_ID")
					return "twitch-client-id";
				if (key === "TWITCH_CLIENT_SECRET")
					return "twitch-client-secret";
				return undefined;
			});

			fetchMock
				.mockResolvedValueOnce(makeResponse(true, {
					access_token: "igdb-token",
					expires_in: 3600,
					token_type: "bearer",
				}))
				.mockResolvedValueOnce(makeResponse(true, [
					{
						id: 123,
						name: "Hades",
						summary: "Escape the Underworld.",
						first_release_date: 1600300800,
						cover: {
							image_id: "co1abc",
						},
						genres: [
							{ id: 5, name: "Role-playing (RPG)" },
						],
						themes: [
							{ id: 17, name: "Fantasy" },
						],
						keywords: [
							{ id: 902, name: "Roguelike" },
						],
					},
				]));

			const result = await service.getGameDetails("123");

			expect(result).toEqual({
				igdbId: "123",
				name: "Hades",
				summary: "Escape the Underworld.",
				coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg",
				firstReleaseDate: new Date(1600300800 * 1000),
				genres: [
					{ externalTagId: "genre:5", label: "Role-playing (RPG)" },
				],
				themes: [
					{ externalTagId: "theme:17", label: "Fantasy" },
				],
				keywords: [
					{ externalTagId: "keyword:902", label: "Roguelike" },
				],
			});

			const igdbOptions = fetchMock.mock.calls[1][1] as {
				body: string;
			};

			expect(igdbOptions.body).toContain("genres.id, genres.name");
			expect(igdbOptions.body).toContain("themes.id, themes.name");
			expect(igdbOptions.body).toContain("keywords.id, keywords.name");
			expect(igdbOptions.body).toContain("where id = 123;");
			expect(igdbOptions.body).toContain("limit 1;");
		});

		// Tag parsing is intentionally tolerant: malformed entries are skipped instead of failing the whole game.
		it("ignores malformed tag entries while keeping valid tags", async () => {
			configService.get.mockImplementation((key: string) => {
				if (key === "TWITCH_CLIENT_ID")
					return "twitch-client-id";
				if (key === "TWITCH_CLIENT_SECRET")
					return "twitch-client-secret";
				return undefined;
			});

			fetchMock
				.mockResolvedValueOnce(makeResponse(true, {
					access_token: "igdb-token",
					expires_in: 3600,
					token_type: "bearer",
				}))
				.mockResolvedValueOnce(makeResponse(true, [
					{
						id: 123,
						name: "Hades",
						genres: [
							null,
							{ id: "bad-id", name: "Broken" },
							{ id: 5, name: "Role-playing (RPG)" },
						],
						themes: "not-an-array",
						keywords: [
							{ id: 902, name: "Roguelike" },
							{ id: 903 },
						],
					},
				]));

			const result = await service.getGameDetails("123");

			expect(result.genres).toEqual([
				{ externalTagId: "genre:5", label: "Role-playing (RPG)" },
			]);
			expect(result.themes).toEqual([]);
			expect(result.keywords).toEqual([
				{ externalTagId: "keyword:902", label: "Roguelike" },
			]);
		});
	});
});
