import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Auth (e2e)", () => {
	let app: INestApplication;
	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();

		// IMPORTANT: reproduit main.ts (DTO validation)
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
				email: "auth1@test.com",
				username: "auth1",
				password: "Str0ngP@ssw0rd!",
			})
			.expect(201);

		expect(res.body).toEqual({
			accessToken: expect.any(String),
		});
		expect(res.body.accessToken.length).toBeGreaterThan(0);
	});

	it("POST /api/auth/register rejects duplicate email", async () => {
		await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({
				email: "dup@test.com",
				username: "user1",
				password: "Str0ngP@ssw0rd!",
			})
			.expect(201);

		const res = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({
				email: "dup@test.com",
				username: "user2",
				password: "Str0ngP@ssw0rd!",
			})
			.expect(400);

		expect(res.body.statusCode).toBe(400);
		expect(res.body.error).toBe("Bad Request");
		expect(res.body.message).toBe("Email already used");
	});

	it("POST /api/auth/login returns accessToken", async () => {
		await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({
				email: "login@test.com",
				username: "loginuser",
				password: "Str0ngP@ssw0rd!",
			})
			.expect(201);

		const res = await request(app.getHttpServer())
			.post("/api/auth/login")
			.send({
				email: "login@test.com",
				password: "Str0ngP@ssw0rd!",
			})
			.expect(200);

		expect(res.body).toEqual({
			accessToken: expect.any(String),
		});
	});

	it("GET /api/auth/me returns user when token is valid", async () => {
		const register = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({
				email: "me@test.com",
				username: "meuser",
				password: "Str0ngP@ssw0rd!",
			})
			.expect(201);

		const token = register.body.accessToken as string;

		const me = await request(app.getHttpServer())
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		expect(me.body).toEqual({
			id: expect.any(String),
			email: "me@test.com",
			username: "meuser",
		});
	});
	it("LEAVE /api/lobbies/:id/leave deletes lobby when last player leaves", async () => {
	// 1) login user1
	const login1 = await request(app.getHttpServer())
		.post("/api/auth/login")
		.send({
			email: "test@test.com",
			password: "TEst@23132_131ERweqwdcq",
		})
		.expect(200);

	const token1 = login1.body.accessToken;

	// 2) create lobby (auto-join owner)
	const createRes = await request(app.getHttpServer())
		.post("/api/lobbies")
		.set("Authorization", `Bearer ${token1}`)
		.send({ name: "Lobby leave last", maxPlayers: 4 })
		.expect(201);

	const lobbyId = createRes.body.id;

	// sanity: lobby exists
	await request(app.getHttpServer())
		.get(`/api/lobbies/${lobbyId}`)
		.expect(200);

	// 3) leave (owner is last player -> lobby should be deleted)
	const leaveRes = await request(app.getHttpServer())
		.post(`/api/lobbies/${lobbyId}/leave`)
		.set("Authorization", `Bearer ${token1}`)
		.expect(200);

	expect(leaveRes.body.id).toBe(lobbyId);
	expect(Array.isArray(leaveRes.body.players)).toBe(true);
	expect(leaveRes.body.players).toEqual([]);

	// 4) lobby deleted => GET 404
	await request(app.getHttpServer())
		.get(`/api/lobbies/${lobbyId}`)
		.expect(404);
	});

	it("LEAVE /api/lobbies/:id/leave transfers ownership if owner leaves and lobby not empty", async () => {
		// 1) login user1 (seeded)
		const login1 = await request(app.getHttpServer())
			.post("/api/auth/login")
			.send({
				email: "test@test.com",
				password: "TEst@23132_131ERweqwdcq",
			})
			.expect(200);

		const token1 = login1.body.accessToken;

		// 2) register + login user2
		const email2 = `u2_${Date.now()}@test.com`;
		const username2 = `user2_${Date.now()}`;
		const password2 = "Str0ngP@ssw0rd!";

		await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({ email: email2, username: username2, password: password2 })
			.expect(201);

		const login2 = await request(app.getHttpServer())
			.post("/api/auth/login")
			.send({ email: email2, password: password2 })
			.expect(200);

		const token2 = login2.body.accessToken;

		// 3) user1 creates lobby (owner=user1, players=[user1])
		const createRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${token1}`)
			.send({ name: "Lobby owner transfer", maxPlayers: 4 })
			.expect(201);

		const lobbyId = createRes.body.id;
		const owner1 = createRes.body.ownerId;

		// 4) user2 joins (players=[user1,user2])
		const joinRes = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${token2}`)
			.expect(200);

		expect(joinRes.body.players.length).toBe(2);

		// 5) user1 leaves => lobby still exists and owner should become user2
		const leaveRes = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/leave`)
			.set("Authorization", `Bearer ${token1}`)
			.expect(200);

		expect(leaveRes.body.id).toBe(lobbyId);
		expect(leaveRes.body.players.length).toBe(1);
		expect(leaveRes.body.players[0]).not.toBe(owner1);
		expect(leaveRes.body.ownerId).toBe(leaveRes.body.players[0]);

		// 6) GET lobby => still exists + owner is user2
		const getRes = await request(app.getHttpServer())
			.get(`/api/lobbies/${lobbyId}`)
			.expect(200);

		expect(getRes.body.ownerId).toBe(getRes.body.players[0]);
		expect(getRes.body.players.length).toBe(1);
	});

	it("LEAVE /api/lobbies/:id/leave returns 400 if user is not in lobby", async () => {
		// login user1
		const login1 = await request(app.getHttpServer())
			.post("/api/auth/login")
			.send({
				email: "test@test.com",
				password: "TEst@23132_131ERweqwdcq",
			})
			.expect(200);

		const token1 = login1.body.accessToken;

		// create lobby with user1
		const createRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${token1}`)
			.send({ name: "Lobby leave not in", maxPlayers: 4 })
			.expect(201);

		const lobbyId = createRes.body.id;

		// register+login user2
		const email2 = `u3_${Date.now()}@test.com`;
		const username2 = `user3_${Date.now()}`;
		const password2 = "Str0ngP@ssw0rd!";

		await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({ email: email2, username: username2, password: password2 })
			.expect(201);

		const login2 = await request(app.getHttpServer())
			.post("/api/auth/login")
			.send({ email: email2, password: password2 })
			.expect(200);

		const token2 = login2.body.accessToken;

		// user2 tries to leave without joining
		const leaveRes = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/leave`)
			.set("Authorization", `Bearer ${token2}`)
			.expect(400);

		expect(leaveRes.body.statusCode).toBe(400);
		expect(leaveRes.body.error).toBe("Bad Request");
		expect(leaveRes.body.message).toBe("Player is not inside the lobby");
	});
});