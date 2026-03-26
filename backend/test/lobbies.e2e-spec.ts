import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { RecommendService } from "../src/lobbies/recommend.service";

/**
 * End-to-end tests for the lobby lifecycle and recommendation flow.
 * Covers auth prerequisites, lobby create/join/leave, ownership transfer,
 * and the recommendation endpoint with readiness and leader gating.
 * Uses a mocked RecommendService and a real PostgreSQL database.
 */
describe("Lobbies (e2e)", () => {
	let app: INestApplication;
	let prisma: PrismaClient;
	let recommendMock: {
		callRecommend: jest.Mock;
	};

	const shortId = (): string => Math.random().toString(36).slice(2, 10);
	const uniqueEmail = (): string => `u_${shortId()}@test.com`;
	const uniqueUsername = (): string => `u_${shortId()}`.slice(0, 20);

	const registerAndLogin = async () => {
		const email = uniqueEmail();
		const username = uniqueUsername();
		const password = "Str0ngP@ssw0rd!";

		await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({ email, username, password })
			.expect(201);

		const login = await request(app.getHttpServer())
			.post("/api/auth/login")
			.send({ email, password })
			.expect(200);

		return { email, username, password, token: login.body.accessToken as string };
	};

	beforeEach(async () => {
		recommendMock = {
			callRecommend: jest.fn(),
		};

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(RecommendService)
			.useValue(recommendMock)
			.compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
			}),
		);
		await app.init();

		prisma = new PrismaClient();
		await prisma.$connect();
	});

	afterEach(async () => {
		await prisma.lobbyTagPreference.deleteMany();
		await prisma.lobbyMember.deleteMany();
		await prisma.lobby.deleteMany();
		await prisma.user.deleteMany();
		await app.close();
	});

	afterAll(async () => {
		await prisma.$disconnect();
	});

	// Verifies that registration returns a valid access token (prerequisite for lobby tests).
	it("POST /api/auth/register returns accessToken", async () => {
		const res = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({
				email: uniqueEmail(),
				username: uniqueUsername(),
				password: "Str0ngP@ssw0rd!",
			})
			.expect(201);

		expect(res.body).toEqual({
			accessToken: expect.any(String),
		});
		expect(res.body.accessToken.length).toBeGreaterThan(0);
	});

	// Verifies that registering with an already-used email returns 400 with a clear error message.
	it("POST /api/auth/register rejects duplicate email", async () => {
		const email = uniqueEmail();

		await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({
				email,
				username: uniqueUsername(),
				password: "Str0ngP@ssw0rd!",
			})
			.expect(201);

		const res = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({
				email,
				username: uniqueUsername(),
				password: "Str0ngP@ssw0rd!",
			})
			.expect(400);

		expect(res.body.statusCode).toBe(400);
		expect(res.body.error).toBe("Bad Request");
		expect(res.body.message).toBe("Email already used");
	});

	// Verifies that a registered user can log in and receive an access token.
	it("POST /api/auth/login returns accessToken", async () => {
		const account = await registerAndLogin();

		expect(account.token).toEqual(expect.any(String));
	});

	// Verifies that /me returns the correct user profile for a valid token.
	it("GET /api/auth/me returns user when token is valid", async () => {
		const account = await registerAndLogin();

		const me = await request(app.getHttpServer())
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${account.token}`)
			.expect(200);

		expect(me.body).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				email: account.email,
				username: account.username,
				steamId: null,
				avatarUrl: null,
			}),
		);
	});

	// Verifies that the lobby is deleted from the database when the last (and only) player leaves.
	it("LEAVE /api/lobbies/:id/leave deletes lobby when last player leaves", async () => {
		const user1 = await registerAndLogin();

		const createRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${user1.token}`)
			.send({ name: "Lobby leave last", maxPlayers: 4 })
			.expect(201);

		const lobbyId = createRes.body.id;

		await request(app.getHttpServer())
			.get(`/api/lobbies/${lobbyId}`)
			.set("Authorization", `Bearer ${user1.token}`)
			.expect(200);

		const leaveRes = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/leave`)
			.set("Authorization", `Bearer ${user1.token}`)
			.expect(200);

		expect(leaveRes.body.id).toBe(lobbyId);
		expect(Array.isArray(leaveRes.body.players)).toBe(true);
		expect(leaveRes.body.players).toEqual([]);

		await request(app.getHttpServer())
			.get(`/api/lobbies/${lobbyId}`)
			.set("Authorization", `Bearer ${user1.token}`)
			.expect(404);
	});

	// Verifies that ownership is transferred to the next member when the current owner leaves a non-empty lobby.
	it("LEAVE /api/lobbies/:id/leave transfers ownership if owner leaves and lobby not empty", async () => {
		const user1 = await registerAndLogin();
		const user2 = await registerAndLogin();

		const createRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${user1.token}`)
			.send({ name: "Lobby owner transfer", maxPlayers: 4 })
			.expect(201);

		const lobbyId = createRes.body.id;
		const owner1 = createRes.body.ownerId;

		const joinRes = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${user2.token}`)
			.expect(200);

		expect(joinRes.body.players.length).toBe(2);

		const leaveRes = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/leave`)
			.set("Authorization", `Bearer ${user1.token}`)
			.expect(200);

		expect(leaveRes.body.id).toBe(lobbyId);
		expect(leaveRes.body.players.length).toBe(1);
		expect(leaveRes.body.players[0].id).not.toBe(owner1);
		expect(leaveRes.body.ownerId).toBe(leaveRes.body.players[0].id);

		const getRes = await request(app.getHttpServer())
			.get(`/api/lobbies/${lobbyId}`)
			.set("Authorization", `Bearer ${user2.token}`)
			.expect(200);

		expect(getRes.body.ownerId).toBe(getRes.body.players[0].id);
		expect(getRes.body.players.length).toBe(1);
	});

	// Verifies that leaving a lobby the user never joined returns 400 with an appropriate error.
	it("LEAVE /api/lobbies/:id/leave returns 400 if user is not in lobby", async () => {
		const user1 = await registerAndLogin();
		const user2 = await registerAndLogin();

		const createRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${user1.token}`)
			.send({ name: "Lobby leave not in", maxPlayers: 4 })
			.expect(201);

		const lobbyId = createRes.body.id;

		const leaveRes = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/leave`)
			.set("Authorization", `Bearer ${user2.token}`)
			.expect(400);

		expect(leaveRes.body.statusCode).toBe(400);
		expect(leaveRes.body.error).toBe("Bad Request");
		expect(leaveRes.body.message).toBe("Player is not inside the lobby");
	});

	// Verifies that a non-leader member cannot trigger the recommendation algorithm (403 Forbidden).
	it("POST /api/lobbies/:id/recommend returns 403 when the requester is not the lobby leader", async () => {
		const owner = await registerAndLogin();
		const member = await registerAndLogin();

		const createRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${owner.token}`)
			.send({ name: "Lobby recommend forbidden", maxPlayers: 4 })
			.expect(201);

		const lobbyId = createRes.body.id;

		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${member.token}`)
			.expect(200);

		const res = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/recommend`)
			.set("Authorization", `Bearer ${member.token}`)
			.expect(403);

		expect(res.body.statusCode).toBe(403);
		expect(res.body.message).toBe("User isnt the leader");
		expect(recommendMock.callRecommend).not.toHaveBeenCalled();
	});

	// Even the leader must wait until every member has at least one tag before the algo can run.
	it("POST /api/lobbies/:id/recommend returns 400 when all players are not ready", async () => {
		const owner = await registerAndLogin();
		const member = await registerAndLogin();

		const createRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${owner.token}`)
			.send({ name: "Lobby recommend not ready", maxPlayers: 4 })
			.expect(201);

		const lobbyId = createRes.body.id;

		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${member.token}`)
			.expect(200);

		const res = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/recommend`)
			.set("Authorization", `Bearer ${owner.token}`)
			.expect(400);

		expect(res.body.statusCode).toBe(400);
		expect(res.body.message).toBe("All players must be ready");
		expect(recommendMock.callRecommend).not.toHaveBeenCalled();
	});

	// Full HTTP happy path: real auth, real lobby, real tags in DB, mocked algo service.
	it("POST /api/lobbies/:id/recommend returns the algo payload when the lobby leader triggers it and everyone is ready", async () => {
		const owner = await registerAndLogin();
		const member = await registerAndLogin();
		recommendMock.callRecommend.mockResolvedValue([
			{
				game_id: "game-1",
				score: 0.91,
			},
		]);

		const createRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${owner.token}`)
			.send({ name: "Lobby recommend ready", maxPlayers: 4 })
			.expect(201);

		const lobbyId = createRes.body.id;

		const ownerTag = await prisma.tag.create({
			data: {
				slug: `owner-tag-${shortId()}`,
				label: "Owner Tag",
			},
		});
		const memberTag = await prisma.tag.create({
			data: {
				slug: `member-tag-${shortId()}`,
				label: "Member Tag",
			},
		});

		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${member.token}`)
			.expect(200);

		// The recommendation route is gated behind readiness, so each player needs at least one tag first.
		await request(app.getHttpServer())
			.put(`/api/lobbies/${lobbyId}/tags`)
			.set("Authorization", `Bearer ${owner.token}`)
			.send({ tagIds: [ownerTag.id] })
			.expect(200);

		await request(app.getHttpServer())
			.put(`/api/lobbies/${lobbyId}/tags`)
			.set("Authorization", `Bearer ${member.token}`)
			.send({ tagIds: [memberTag.id] })
			.expect(200);

		const res = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/recommend`)
			.set("Authorization", `Bearer ${owner.token}`)
			.expect(201);

		expect(recommendMock.callRecommend).toHaveBeenCalledWith(lobbyId);
		expect(res.body).toEqual([
			{
				game_id: "game-1",
				score: 0.91,
			},
		]);
	});
});
