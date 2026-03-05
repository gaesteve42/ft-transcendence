import { SteamLibraryImportService } from "./steam-library-import.service";
import { SteamGamesService } from "src/steam-games/steam-games.service";
import { GameService } from "./games.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("SteamLibraryImportService", () => {
	let service: SteamLibraryImportService;
	let steamGames: { getOwnedGames: jest.Mock };

	beforeEach(() => {
		steamGames = {
			getOwnedGames: jest.fn(),
		};
		const gameService = {} as GameService;
		const prisma = {} as PrismaService;
		service = new SteamLibraryImportService(
			steamGames as unknown as SteamGamesService,
			gameService,
			prisma,
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
});
