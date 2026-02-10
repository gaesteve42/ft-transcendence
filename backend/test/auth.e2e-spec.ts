import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";

describe("Auth (e2e)", () => {
	let app: INestApplication<App>;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

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

	it("POST /api/auth/register registers a user", async () => {
		const stamp = Date.now();
		const email = `u_${stamp}@test.com`;
		const username = `user_${stamp}`;

		const res = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({
				email,
				username,
				password: "Str0ngP@ssw0rd!",
			})
			.expect(201);

		expect(res.body).toEqual({
			accessToken: expect.any(String),
		});
		expect(res.body.accessToken.length).toBeGreaterThan(10);
	});

	it("POST /api/auth/register rejects username too short (DTO)", async () => {
		const stamp = Date.now();
		const email = `u_${stamp}@test.com`;

		const res = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({
				email,
				username: "u1",
				password: "Str0ngP@ssw0rd!",
			})
			.expect(400);

		expect(res.body.statusCode).toBe(400);
		expect(res.body.error).toBe("Bad Request");

		/* message can be string (BadRequestException) OR array (class-validator) */
		const msg = res.body.message;
		if (Array.isArray(msg))
			expect(msg.join(" ")).toContain("username");
		else
			expect(String(msg)).toContain("username");
	});

	it("POST /api/auth/login returns token when credentials are valid", async () => {
		const stamp = Date.now();
		const email = `u_${stamp}@test.com`;
		const username = `user_${stamp}`;
		const password = "Str0ngP@ssw0rd!";

		await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({ email, username, password })
			.expect(201);

		const res = await request(app.getHttpServer())
			.post("/api/auth/login")
			.send({ email, password })
			.expect(200);

		expect(res.body).toEqual({
			accessToken: expect.any(String),
		});
		expect(res.body.accessToken.length).toBeGreaterThan(10);
	});

	it("GET /api/auth/me returns current user when token is valid", async () => {
		const stamp = Date.now();
		const email = `u_${stamp}@test.com`;
		const username = `user_${stamp}`;
		const password = "Str0ngP@ssw0rd!";

		await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({ email, username, password })
			.expect(201);

		const loginRes = await request(app.getHttpServer())
			.post("/api/auth/login")
			.send({ email, password })
			.expect(200);

		const token = loginRes.body.accessToken;

		const meRes = await request(app.getHttpServer())
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		expect(meRes.body).toEqual({
			id: expect.any(String),
			email,
			username,
		});
	});

	it("GET /api/auth/me returns 401 when no token", async () => {
		const res = await request(app.getHttpServer())
			.get("/api/auth/me")
			.expect(401);

		expect(res.body.statusCode).toBe(401);
		expect(res.body.message).toBe("Unauthorized");
	});

	it("GET /api/auth/me returns 401 when token is invalid", async () => {
		const res = await request(app.getHttpServer())
			.get("/api/auth/me")
			.set("Authorization", "Bearer invalid.token.here")
			.expect(401);

		expect(res.body.statusCode).toBe(401);
		expect(res.body.message).toBe("Unauthorized");
	});
});
