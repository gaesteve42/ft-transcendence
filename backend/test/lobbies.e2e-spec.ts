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
});