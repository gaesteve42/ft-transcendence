import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
process.env.JWT_EXPIRES_IN_SECONDES = process.env.JWT_EXPIRES_IN_SECONDES ?? "900";

describe("Persistence (e2e)", () => {
	let app: INestApplication;
	let prisma: PrismaClient;
	const rand = (): string => Math.random().toString(36).slice(2, 8);

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

		prisma = new PrismaClient();
		await prisma.$connect();
	});

	beforeEach(async () => {
		await prisma.lobbyMember.deleteMany();
		await prisma.lobby.deleteMany();
		await prisma.user.deleteMany();
	});

	afterAll(async () => {
		await prisma.$disconnect();
		await app.close();
	});

	it("persists a registered user in PostgreSQL", async () => {
		const suffix = rand();
		const email = `pu_${suffix}@test.com`;
		const username = `pu_${suffix}`;
		const password = "Str0ngP@ssw0rd!";

		await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({ email, username, password })
			.expect(201);

		const userInDb = await prisma.user.findUnique({
			where: { email },
		});

		expect(userInDb).toBeTruthy();
		expect(userInDb?.email).toBe(email);
		expect(userInDb?.username).toBe(username);
		expect(userInDb?.passwordHash).not.toBe(password);
		expect(userInDb?.passwordHash.startsWith("$2")).toBe(true);
	});

	it("persists created lobby and owner membership", async () => {
		const suffix = rand();
		const email = `pl_${suffix}@test.com`;
		const username = `pl_${suffix}`;
		const password = "Str0ngP@ssw0rd!";

		const registerRes = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send({ email, username, password })
			.expect(201);
		const token = registerRes.body.accessToken as string;

		const createLobbyRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${token}`)
			.send({ name: "DB Persist Lobby", maxPlayers: 4 })
			.expect(201);

		const lobbyId = createLobbyRes.body.id as string;
		const userInDb = await prisma.user.findUnique({ where: { email } });
		expect(userInDb).toBeTruthy();

		const lobbyInDb = await prisma.lobby.findUnique({
			where: { id: lobbyId },
			include: { members: true },
		});

		expect(lobbyInDb).toBeTruthy();
		expect(lobbyInDb?.ownerId).toBe(userInDb?.id);
		expect(lobbyInDb?.members.length).toBe(1);
		expect(lobbyInDb?.members[0].userId).toBe(userInDb?.id);
	});

	it("persists join and leave transitions in lobby memberships", async () => {
		const suffix = rand();
		const user1 = {
			email: `p1_${suffix}@test.com`,
			username: `p1_${suffix}`,
			password: "Str0ngP@ssw0rd!",
		};
		const user2 = {
			email: `p2_${suffix}@test.com`,
			username: `p2_${suffix}`,
			password: "Str0ngP@ssw0rd!",
		};

		const user1Register = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send(user1)
			.expect(201);
		const user1Token = user1Register.body.accessToken as string;

		const user2Register = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send(user2)
			.expect(201);
		const user2Token = user2Register.body.accessToken as string;

		const createLobbyRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${user1Token}`)
			.send({ name: "DB Join Leave", maxPlayers: 4 })
			.expect(201);
		const lobbyId = createLobbyRes.body.id as string;

		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${user2Token}`)
			.expect(200);

		const membersAfterJoin = await prisma.lobbyMember.findMany({
			where: { lobbyId },
			orderBy: { joinedAt: "asc" },
		});
		expect(membersAfterJoin.length).toBe(2);

		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/leave`)
			.set("Authorization", `Bearer ${user1Token}`)
			.expect(200);

		const lobbyAfterOwnerLeave = await prisma.lobby.findUnique({
			where: { id: lobbyId },
			include: { members: true },
		});
		const user2InDb = await prisma.user.findUnique({ where: { email: user2.email } });

		expect(lobbyAfterOwnerLeave).toBeTruthy();
		expect(lobbyAfterOwnerLeave?.members.length).toBe(1);
		expect(lobbyAfterOwnerLeave?.ownerId).toBe(user2InDb?.id);
	});

	it("rejects join when lobby is already full (4/4)", async () => {
		const suffix = rand();
		const users = [
			{ email: `f1_${suffix}@test.com`, username: `f1_${suffix}`, password: "Str0ngP@ssw0rd!" },
			{ email: `f2_${suffix}@test.com`, username: `f2_${suffix}`, password: "Str0ngP@ssw0rd!" },
			{ email: `f3_${suffix}@test.com`, username: `f3_${suffix}`, password: "Str0ngP@ssw0rd!" },
			{ email: `f4_${suffix}@test.com`, username: `f4_${suffix}`, password: "Str0ngP@ssw0rd!" },
			{ email: `f5_${suffix}@test.com`, username: `f5_${suffix}`, password: "Str0ngP@ssw0rd!" },
		];

		const tokens: string[] = [];
		for (const user of users) {
			const registerRes = await request(app.getHttpServer())
				.post("/api/auth/register")
				.send(user)
				.expect(201);
			tokens.push(registerRes.body.accessToken as string);
		}

		const createLobbyRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${tokens[0]}`)
			.send({ name: "Full lobby", maxPlayers: 4 })
			.expect(201);
		const lobbyId = createLobbyRes.body.id as string;

		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${tokens[1]}`)
			.expect(200);
		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${tokens[2]}`)
			.expect(200);
		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${tokens[3]}`)
			.expect(200);

		const fullAttempt = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${tokens[4]}`)
			.expect(400);

		expect(fullAttempt.body.message).toBe("Too many players in this lobby");

		const members = await prisma.lobbyMember.findMany({
			where: { lobbyId },
		});
		expect(members.length).toBe(4);
	});

	it("deletes lobby when the last player leaves", async () => {
		const suffix = rand();
		const user = {
			email: `last_${suffix}@test.com`,
			username: `last_${suffix}`,
			password: "Str0ngP@ssw0rd!",
		};

		const registerRes = await request(app.getHttpServer())
			.post("/api/auth/register")
			.send(user)
			.expect(201);
		const token = registerRes.body.accessToken as string;

		const createLobbyRes = await request(app.getHttpServer())
			.post("/api/lobbies")
			.set("Authorization", `Bearer ${token}`)
			.send({ name: "Delete on last leave", maxPlayers: 4 })
			.expect(201);
		const lobbyId = createLobbyRes.body.id as string;

		const leaveRes = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/leave`)
			.set("Authorization", `Bearer ${token}`)
			.expect(200);
		expect(leaveRes.body.players).toEqual([]);

		await request(app.getHttpServer())
			.get(`/api/lobbies/${lobbyId}`)
			.set("Authorization", `Bearer ${token}`)
			.expect(404);

		const lobbyInDb = await prisma.lobby.findUnique({
			where: { id: lobbyId },
		});
		expect(lobbyInDb).toBeNull();
	});

	it("rejects joining a second lobby when user is already in another lobby", async () => {
		const suffix = rand();
		const owner1 = {
			email: `o1_${suffix}@test.com`,
			username: `o1_${suffix}`,
			password: "Str0ngP@ssw0rd!",
		};
		const owner2 = {
			email: `o2_${suffix}@test.com`,
			username: `o2_${suffix}`,
			password: "Str0ngP@ssw0rd!",
		};
		const guest = {
			email: `g_${suffix}@test.com`,
			username: `g_${suffix}`,
			password: "Str0ngP@ssw0rd!",
		};

		const owner1Token = (
			await request(app.getHttpServer()).post("/api/auth/register").send(owner1).expect(201)
		).body.accessToken as string;
		const owner2Token = (
			await request(app.getHttpServer()).post("/api/auth/register").send(owner2).expect(201)
		).body.accessToken as string;
		const guestToken = (
			await request(app.getHttpServer()).post("/api/auth/register").send(guest).expect(201)
		).body.accessToken as string;

		const lobby1Id = (
			await request(app.getHttpServer())
				.post("/api/lobbies")
				.set("Authorization", `Bearer ${owner1Token}`)
				.send({ name: "Lobby 1", maxPlayers: 4 })
				.expect(201)
		).body.id as string;

		const lobby2Id = (
			await request(app.getHttpServer())
				.post("/api/lobbies")
				.set("Authorization", `Bearer ${owner2Token}`)
				.send({ name: "Lobby 2", maxPlayers: 4 })
				.expect(201)
		).body.id as string;

		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobby1Id}/join`)
			.set("Authorization", `Bearer ${guestToken}`)
			.expect(200);

		const secondJoin = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobby2Id}/join`)
			.set("Authorization", `Bearer ${guestToken}`)
			.expect(400);

		expect(secondJoin.body.message).toBe("Player is already inside a lobby");

		const guestInDb = await prisma.user.findUnique({ where: { email: guest.email } });
		expect(guestInDb).toBeTruthy();

		const memberships = await prisma.lobbyMember.findMany({
			where: { userId: guestInDb!.id },
		});
		expect(memberships.length).toBe(1);
		expect(memberships[0].lobbyId).toBe(lobby1Id);
	});

	it("returns 404 when trying to join a lobby that was just deleted", async () => {
		const suffix = rand();
		const owner = {
			email: `del_owner_${suffix}@test.com`,
			username: `del_owner_${suffix}`,
			password: "Str0ngP@ssw0rd!",
		};
		const joiner = {
			email: `del_joiner_${suffix}@test.com`,
			username: `del_joiner_${suffix}`,
			password: "Str0ngP@ssw0rd!",
		};

		const ownerToken = (
			await request(app.getHttpServer()).post("/api/auth/register").send(owner).expect(201)
		).body.accessToken as string;
		const joinerToken = (
			await request(app.getHttpServer()).post("/api/auth/register").send(joiner).expect(201)
		).body.accessToken as string;

		const lobbyId = (
			await request(app.getHttpServer())
				.post("/api/lobbies")
				.set("Authorization", `Bearer ${ownerToken}`)
				.send({ name: "Ephemeral Lobby", maxPlayers: 4 })
				.expect(201)
		).body.id as string;

		await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/leave`)
			.set("Authorization", `Bearer ${ownerToken}`)
			.expect(200);

		const joinDeleted = await request(app.getHttpServer())
			.post(`/api/lobbies/${lobbyId}/join`)
			.set("Authorization", `Bearer ${joinerToken}`)
			.expect(404);

		expect(joinDeleted.body.message).toBe("Lobby not found");
	});
});
