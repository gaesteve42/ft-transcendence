import { BadRequestException, INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { SteamLibraryImportService } from "../src/games/steam-library-import.service";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Games Steam Preview/Import (e2e)", () => {
	let app: INestApplication;
	let steamImportMock: { previewImport: jest.Mock; importLibrary: jest.Mock };
	let prismaMock: { $connect: jest.Mock; $disconnect: jest.Mock };

	beforeAll(async () => {
		steamImportMock = {
			previewImport: jest.fn(),
			importLibrary: jest.fn(),
		};
		prismaMock = {
			$connect: jest.fn(),
			$disconnect: jest.fn(),
		};

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(PrismaService)
			.useValue(prismaMock)
			.overrideProvider(SteamLibraryImportService)
			.useValue(steamImportMock)
			.compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
				forbidNonWhitelisted: true,
			}),
		);
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("GET /api/games/steam/:steamId/preview returns preview payload", async () => {
		const steamId = "76561198000000000";
		const fetchedAt = new Date("2026-03-05T10:00:00.000Z");

		steamImportMock.previewImport.mockResolvedValue({
			steamId,
			fetchedAt,
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
				{
					appId: "20",
					name: "Portal 2",
					playtimeMinutesForever: 300,
					playtimeMinutesLast2Weeks: 0,
					iconUrl: null,
				},
			],
		});

		const res = await request(app.getHttpServer())
			.get(`/api/games/steam/${steamId}/preview`)
			.expect(200);

		expect(steamImportMock.previewImport).toHaveBeenCalledWith(steamId);
		expect(res.body).toEqual({
			steamId,
			fetchedAt: fetchedAt.toISOString(),
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
				{
					appId: "20",
					name: "Portal 2",
					playtimeMinutesForever: 300,
					playtimeMinutesLast2Weeks: 0,
					iconUrl: null,
				},
			],
		});
	});

	it("GET /api/games/steam/:steamId/preview propagates domain errors", async () => {
		const steamId = "invalid-steam-id";
		steamImportMock.previewImport.mockRejectedValue(
			new BadRequestException("Steam ID is invalid"),
		);

		const res = await request(app.getHttpServer())
			.get(`/api/games/steam/${steamId}/preview`)
			.expect(400);

		expect(steamImportMock.previewImport).toHaveBeenCalledWith(steamId);
		expect(res.body.statusCode).toBe(400);
		expect(res.body.error).toBe("Bad Request");
	});

	it("POST /api/games/steam/:steamId/import returns import summary", async () => {
		const steamId = "76561198000000000";
		const importedAt = new Date("2026-03-05T10:00:00.000Z");
		steamImportMock.importLibrary.mockResolvedValue({
			steamId,
			userId: "user-1",
			importedAt,
			totalFetched: 2,
			createdCanonicalGames: 1,
			linkedUserGames: 2,
			updatedUserGames: 0,
		});

		const res = await request(app.getHttpServer())
			.post(`/api/games/steam/${steamId}/import`)
			.expect(201);

		expect(steamImportMock.importLibrary).toHaveBeenCalledWith(steamId);
		expect(res.body).toEqual({
			steamId,
			userId: "user-1",
			importedAt: importedAt.toISOString(),
			totalFetched: 2,
			createdCanonicalGames: 1,
			linkedUserGames: 2,
			updatedUserGames: 0,
		});
	});

	it("POST /api/games/steam/:steamId/import propagates domain errors", async () => {
		const steamId = "invalid-steam-id";
		steamImportMock.importLibrary.mockRejectedValue(
			new BadRequestException("Steam ID is invalid"),
		);

		const res = await request(app.getHttpServer())
			.post(`/api/games/steam/${steamId}/import`)
			.expect(400);

		expect(steamImportMock.importLibrary).toHaveBeenCalledWith(steamId);
		expect(res.body.statusCode).toBe(400);
		expect(res.body.error).toBe("Bad Request");
	});
});
