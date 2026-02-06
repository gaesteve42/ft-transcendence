import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "900";

describe("Lobbies (e2e)", () => {
  let app: INestApplication<App>;

	beforeAll(async () => {
	const moduleFixture: TestingModule = await Test.createTestingModule({
	imports: [AppModule],
	}).compile();

	app = moduleFixture.createNestApplication();
	await app.init();
	});

	afterAll(async () => {
	if (app) await app.close();
	});

	it("POST /api/lobbies creates a lobby", async () => {
	const res = await request(app.getHttpServer())
	.post("/api/lobbies")
	.send({ name: "Lobby e2e", maxPlayers: 2 })
	.expect(201);

	expect(res.body).toEqual({
	id: expect.any(String),
	name: "Lobby e2e",
	maxPlayers: 2,
	players: [],
	});
	expect(res.body.id.length).toBeGreaterThan(0);
	});
	it("POST /api/lobbies reject empty name", async () => {
	
		const res = await request(app.getHttpServer())
		.post("/api/lobbies")
		.send({ name: "", maxPlayers: 2 })
		.expect(400);
		
		expect(res.body.statusCode).toBe(400);
		expect(res.body.error).toBe("Bad Request");
		expect(res.body.message).toBe("Invalid name");
		});
	it("GET /api/lobbies/:id returns the lobby", async() =>{
		const res = await request(app.getHttpServer())
		.post("/api/lobbies")
		.send({ name: "Lobby get", maxPlayers: 3 })
		.expect(201);
		const id = res.body.id;
		const resGet = await request(app.getHttpServer()).get(`/api/lobbies/${id}`).expect(200);
		expect(resGet.body).toEqual({
		id: expect.any(String),
		name: "Lobby get",
		maxPlayers: 3,
		players: [],
		});
		expect(resGet.body.id).toBe(id);
		expect(res.body.id).toContain("-");
		expect(res.body.id.length).toBeGreaterThan(30);
		expect(resGet.body.name).toBe("Lobby get");
		expect(resGet.body.maxPlayers).toBe(3);
	});
	it("GET /api/lobbies/:id returns 404 when not found", async() => {
		const res = await request(app.getHttpServer())
		.get("/api/lobbies/does-not-exist")
		.expect(404);

		expect(res.body.statusCode).toBe(404);
		expect(res.body.error).toBe("Not Found");
		expect(res.body.message).toBe("Lobby not found");
	});
	it("GET /api/lobbies returns a list", async() =>{
		await request(app.getHttpServer())
		.post("/api/lobbies")
    		.send({ name: "Lobby A", maxPlayers: 2 })
    		.expect(201);

		await request(app.getHttpServer())
		.post("/api/lobbies")
		.send({ name: "Lobby B", maxPlayers: 3 })
		.expect(201);
		const res = await request(app.getHttpServer())
		.get("/api/lobbies")
		.expect(200);

		expect(Array.isArray(res.body)).toBe(true);
		expect(res.body.length).toBeGreaterThanOrEqual(2);

		expect(res.body[0]).toHaveProperty("id");
		expect(res.body[0]).toHaveProperty("name");
		expect(res.body[0]).toHaveProperty("maxPlayers");
		expect(res.body[0]).toHaveProperty("players");

	});
	it("JOIN /api/lobbies/:id/join joins and enforces rules", async() => {
		const res = await request(app.getHttpServer())
		.post("/api/lobbies")
		.send({ name: "Lobby e2e", maxPlayers: 2 })
		.expect(201);
		const id = res.body.id;
		expect(res.body).toEqual({
		id: expect.any(String),
		name: "Lobby e2e",
		maxPlayers: 2,
		players: [],
		});
		expect(res.body.id.length).toBeGreaterThan(0);

		const join1= await request(app.getHttpServer())
		.post(`/api/lobbies/${id}/join`)
		.send({playerId: "p1"})
		.expect(200);
		expect(join1.body.players).toEqual(["p1"]);

		const joinDouble = await request(app.getHttpServer())
		.post(`/api/lobbies/${id}/join`)
		.send({playerId: "p1"})
		.expect(400);
		expect(joinDouble.body.message).toBe("Player is already inside the lobby");

		const join2= await request(app.getHttpServer())
		.post(`/api/lobbies/${id}/join`)
		.send({playerId: "p2"})
		.expect(200);
		expect(join2.body.players).toEqual(["p1", "p2"]);

		const joinFull= await request(app.getHttpServer())
		.post(`/api/lobbies/${id}/join`)
		.send({playerId: "p3"})
		.expect(400);
		expect(joinFull.body.message).toBe("Too many players in this lobby");
	});
});
