import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { SteamLibraryImportService } from "../src/games/steam-library-import.service";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Games Steam Preview/Import (e2e)", () => {
	let app: INestApplication;
	let steamImportMock: {
		previewImport: jest.Mock;
		importLibrary: jest.Mock;
		importLibraryForUser: jest.Mock;
	};
	let prismaMock: { $connect: jest.Mock; $disconnect: jest.Mock };

	beforeAll(async () => {
		steamImportMock = {
			previewImport: jest.fn(),
			importLibrary: jest.fn(),
			importLibraryForUser: jest.fn(),
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

	it("GET /api/games/steam/:steamId/preview returns 401 without JWT", async () => {
		const steamId = "76561198000000000";
		await request(app.getHttpServer())
			.get(`/api/games/steam/${steamId}/preview`)
			.expect(401);

		expect(steamImportMock.previewImport).not.toHaveBeenCalled();
	});

	it("POST /api/games/steam/:steamId/import returns 401 without JWT", async () => {
		const steamId = "76561198000000000";
		await request(app.getHttpServer())
			.post(`/api/games/steam/${steamId}/import`)
			.expect(401);

		expect(steamImportMock.importLibrary).not.toHaveBeenCalled();
	});

	it("POST /api/games/steam/import/me returns 401 without JWT", async () => {
		await request(app.getHttpServer())
			.post("/api/games/steam/import/me")
			.expect(401);

		expect(steamImportMock.importLibraryForUser).not.toHaveBeenCalled();
	});

});
