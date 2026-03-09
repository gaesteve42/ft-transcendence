import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Lobbies (e2e)", () => {
	let app: INestApplication;

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
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
			}),
		);
		await app.init();
	});

	afterEach(async () => {
		await app.close();
	});

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

	it("POST /api/auth/login returns accessToken", async () => {
		const account = await registerAndLogin();

		expect(account.token).toEqual(expect.any(String));
	});

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
		expect(leaveRes.body.players[0]).not.toBe(owner1);
		expect(leaveRes.body.ownerId).toBe(leaveRes.body.players[0]);

		const getRes = await request(app.getHttpServer())
			.get(`/api/lobbies/${lobbyId}`)
			.set("Authorization", `Bearer ${user2.token}`)
			.expect(200);

		expect(getRes.body.ownerId).toBe(getRes.body.players[0]);
		expect(getRes.body.players.length).toBe(1);
	});

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
});
