jest.mock("@nestjs/passport", () => {
	const actual = jest.requireActual("@nestjs/passport");

	class MockSteamGuard {
		canActivate(context: {
			switchToHttp: () => { getRequest: () => { user?: unknown } };
		}) {
			const req = context.switchToHttp().getRequest();
			req.user = {
				steamId: "76561198193621067",
				username: "Middle",
				avatarUrl: "https://avatars.test/full.jpg",
			};
			return true;
		}
	}

	return {
		...actual,
		AuthGuard: (name: string) => (name === "steam" ? MockSteamGuard : actual.AuthGuard(name)),
	};
});

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AuthProvider } from "@prisma/client";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { UsersService } from "../src/users/users.service";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "https://localhost";
process.env.STEAM_RETURN_URL = process.env.STEAM_RETURN_URL ?? "https://localhost/api/auth/steam/return";
process.env.STEAM_REALM = process.env.STEAM_REALM ?? "https://localhost";
process.env.STEAM_API_KEY = process.env.STEAM_API_KEY ?? "test-steam-api-key";

describe("Auth Steam Link (e2e)", () => {
	let app: INestApplication;
	let jwtService: JwtService;
	let usersMock: {
		findById: jest.Mock;
		findBySteamId: jest.Mock;
		updateSteamProfile: jest.Mock;
		createSteamUser: jest.Mock;
		linkSteamToLocalUser: jest.Mock;
	};
	let prismaMock: {
		$connect: jest.Mock;
		$disconnect: jest.Mock;
	};

	beforeAll(async () => {
		usersMock = {
			findById: jest.fn(),
			findBySteamId: jest.fn(),
			updateSteamProfile: jest.fn(),
			createSteamUser: jest.fn(),
			linkSteamToLocalUser: jest.fn(),
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
			.overrideProvider(UsersService)
			.useValue(usersMock)
			.compile();

		app = moduleFixture.createNestApplication();
		app.use(cookieParser());
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
				forbidNonWhitelisted: true,
			}),
		);
		await app.init();
		jwtService = moduleFixture.get(JwtService);
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const localUser = {
		id: "local-user-1",
		email: "local@test.com",
		username: "local_user",
		passwordHash: "hash",
		steamId: null,
		avatarUrl: null,
		authProvider: AuthProvider.LOCAL,
		steamLinkedAt: null,
		lastSteamUpdated: null,
	};

	it("POST /api/auth/steam/link/start returns 401 when no token", async () => {
		const res = await request(app.getHttpServer())
			.post("/api/auth/steam/link/start")
			.expect(401);

		expect(res.body.statusCode).toBe(401);
		expect(res.body.message).toBe("Unauthorized");
	});

	it("POST /api/auth/steam/link/start stores a steam link intent cookie for the authenticated user", async () => {
		// On mock juste la résolution du user JWT: le but ici est de vérifier le contrat HTTP du flow.
		usersMock.findById.mockResolvedValue(localUser);
		const token = jwtService.sign({ sub: "local-user-1" });

		const res = await request(app.getHttpServer())
			.post("/api/auth/steam/link/start")
			.set("Authorization", `Bearer ${token}`)
			.expect(201);

		expect(usersMock.findById).toHaveBeenCalledWith("local-user-1");
		expect(res.body).toEqual({ redirectUrl: "/api/auth/steam" });
		expect(res.headers["set-cookie"]).toEqual(
			expect.arrayContaining([
				expect.stringContaining("steam_link_intent="),
			]),
		);
		expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
		expect(res.headers["set-cookie"][0]).toContain("Secure");
		expect(res.headers["set-cookie"][0]).toContain("Path=/");
	});

	it("GET /api/auth/steam/return keeps the normal Steam login flow when no link intent cookie exists", async () => {
		usersMock.findBySteamId.mockResolvedValue(undefined);
		usersMock.createSteamUser.mockResolvedValue({
			...localUser,
			id: "steam-user-1",
			username: "Middle",
			email: null,
			passwordHash: null,
			steamId: "76561198193621067",
			avatarUrl: "https://avatars.test/full.jpg",
			authProvider: AuthProvider.STEAM,
			steamLinkedAt: new Date("2026-03-12T10:00:00.000Z"),
		});

		const res = await request(app.getHttpServer())
			.get("/api/auth/steam/return")
			.expect(302);

		// Sans intent, le callback garde le comportement historique de login Steam.
		expect(usersMock.findBySteamId).toHaveBeenCalledWith("76561198193621067");
		expect(usersMock.createSteamUser).toHaveBeenCalledWith({
			steamId: "76561198193621067",
			username: "Middle",
			avatarUrl: "https://avatars.test/full.jpg",
		});
		expect(usersMock.linkSteamToLocalUser).not.toHaveBeenCalled();
		expect(res.headers.location).toMatch(/^https:\/\/localhost\/auth\/callback\?code=/);
	});

	it("GET /api/auth/steam/return links the Steam account to the authenticated local user when the intent cookie exists", async () => {
		usersMock.findById.mockResolvedValue(localUser);
		usersMock.linkSteamToLocalUser.mockResolvedValue({
			...localUser,
			steamId: "76561198193621067",
			avatarUrl: "https://avatars.test/full.jpg",
			steamLinkedAt: new Date("2026-03-12T10:00:00.000Z"),
			lastSteamUpdated: new Date("2026-03-12T10:00:00.000Z"),
		});
		const token = jwtService.sign({ sub: "local-user-1" });
		const startRes = await request(app.getHttpServer())
			.post("/api/auth/steam/link/start")
			.set("Authorization", `Bearer ${token}`)
			.expect(201);
		const linkIntentCookie = startRes.headers["set-cookie"][0].split(";")[0];

		const res = await request(app.getHttpServer())
			.get("/api/auth/steam/return")
			// Supertest ne rejoue pas naturellement un cookie Secure sur son serveur HTTP local de test.
			.set("Cookie", linkIntentCookie)
			.expect(302);

		expect(usersMock.linkSteamToLocalUser).toHaveBeenCalledWith(
			"local-user-1",
			"76561198193621067",
			"https://avatars.test/full.jpg",
		);
		expect(usersMock.findBySteamId).not.toHaveBeenCalled();
		expect(res.headers["set-cookie"]).toEqual(
			expect.arrayContaining([
				expect.stringContaining("steam_link_intent=;"),
			]),
		);
		expect(res.headers.location).toMatch(/^https:\/\/localhost\/auth\/callback\?code=/);
	});

	it("GET /api/auth/steam/return rejects an invalid link intent cookie", async () => {
		const res = await request(app.getHttpServer())
			.get("/api/auth/steam/return")
			.set("Cookie", "steam_link_intent=unknown-intent")
			.expect(401);

		expect(res.body.statusCode).toBe(401);
		expect(res.body.message).toBe("Link intent ID is invalid");
	});
});
