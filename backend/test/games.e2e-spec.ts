import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ExternalGameSource, PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
process.env.JWT_EXPIRES_IN_SECONDES = process.env.JWT_EXPIRES_IN_SECONDES ?? "900";

describe("Games (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const rand = (): string => Math.random().toString(36).slice(2, 8);
  const registerAndLogin = async (): Promise<string> => {
    const suffix = rand();
    const email = `g_${suffix}@test.com`;
    const username = `g_${suffix}`;
    const password = "Str0ngP@ssw0rd!";

    const registerRes = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, username, password })
      .expect(201);
    return registerRes.body.accessToken as string;
  };

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
    await prisma.userGame.deleteMany();
    await prisma.gameSourceTag.deleteMany();
    await prisma.gameExternalId.deleteMany();
    await prisma.game.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it("POST /api/games/upsert-external creates a canonical game and its external mapping", async () => {
    const token = await registerAndLogin();
    const suffix = rand();
    const payload = {
      source: ExternalGameSource.STEAM,
      externalId: `steam_${suffix}`,
      externalUrl: `https://store.steampowered.com/app/${suffix}`,
      canonicalSlug: `hades-${suffix}`,
      name: `Hades ${suffix}`,
      summary: "roguelike",
      coverUrl: "https://example.com/hades.jpg",
      firstReleaseDate: "2020-09-17T00:00:00.000Z",
    };

    const res = await request(app.getHttpServer())
      .post("/api/games/upsert-external")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      canonicalSlug: payload.canonicalSlug,
      name: payload.name,
      summary: payload.summary,
      coverUrl: payload.coverUrl,
      firstReleaseDate: payload.firstReleaseDate,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const gameInDb = await prisma.game.findUnique({
      where: { canonicalSlug: payload.canonicalSlug },
    });
    expect(gameInDb).toBeTruthy();
    expect(gameInDb?.name).toBe(payload.name);

    const mappingInDb = await prisma.gameExternalId.findUnique({
      where: {
        source_externalId: {
          source: payload.source,
          externalId: payload.externalId,
        },
      },
    });
    expect(mappingInDb).toBeTruthy();
    expect(mappingInDb?.gameId).toBe(gameInDb?.id);
    expect(mappingInDb?.externalUrl).toBe(payload.externalUrl);
  });

  it("POST /api/games/upsert-external is idempotent for the same source and externalId", async () => {
    const token = await registerAndLogin();
    const suffix = rand();
    const payload = {
      source: ExternalGameSource.STEAM,
      externalId: `steam_${suffix}`,
      externalUrl: `https://store.steampowered.com/app/${suffix}`,
      canonicalSlug: `hades-${suffix}`,
      name: `Hades ${suffix}`,
      summary: "roguelike",
      coverUrl: "https://example.com/hades.jpg",
      firstReleaseDate: "2020-09-17T00:00:00.000Z",
    };

    const first = await request(app.getHttpServer())
      .post("/api/games/upsert-external")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post("/api/games/upsert-external")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.createdAt).toBe(first.body.createdAt);

    const gamesCount = await prisma.game.count();
    const mappingsCount = await prisma.gameExternalId.count();
    expect(gamesCount).toBe(1);
    expect(mappingsCount).toBe(1);
  });

  it("POST /api/games/upsert-external accepts nullable optional fields", async () => {
    const token = await registerAndLogin();
    const suffix = rand();
    const payload = {
      source: ExternalGameSource.IGDB,
      externalId: `igdb_${suffix}`,
      externalUrl: null,
      canonicalSlug: `game-${suffix}`,
      name: `Game ${suffix}`,
      summary: null,
      coverUrl: null,
      firstReleaseDate: null,
    };

    const res = await request(app.getHttpServer())
      .post("/api/games/upsert-external")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(res.body.summary).toBeNull();
    expect(res.body.coverUrl).toBeNull();
    expect(res.body.firstReleaseDate).toBeNull();

    const gameInDb = await prisma.game.findUnique({
      where: { canonicalSlug: payload.canonicalSlug },
    });
    expect(gameInDb?.summary).toBeNull();
    expect(gameInDb?.coverUrl).toBeNull();
    expect(gameInDb?.firstReleaseDate).toBeNull();
  });

  it("POST /api/games/upsert-external rejects invalid enum source", async () => {
    const token = await registerAndLogin();
    const suffix = rand();

    const res = await request(app.getHttpServer())
      .post("/api/games/upsert-external")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "XBOX",
        externalId: `bad_${suffix}`,
        canonicalSlug: `bad-${suffix}`,
        name: `Bad ${suffix}`,
      })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.error).toBe("Bad Request");
  });

  it("POST /api/games/upsert-external rejects missing required fields", async () => {
    const token = await registerAndLogin();
    const res = await request(app.getHttpServer())
      .post("/api/games/upsert-external")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: ExternalGameSource.STEAM,
        externalId: "",
        canonicalSlug: "",
        name: "",
      })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.error).toBe("Bad Request");

    const message = Array.isArray(res.body.message) ? res.body.message.join(" ") : String(res.body.message);
    expect(message).toContain("externalId");
    expect(message).toContain("canonicalSlug");
    expect(message).toContain("name");
  });

  it("POST /api/games/upsert-external rejects invalid date string", async () => {
    const token = await registerAndLogin();
    const suffix = rand();

    const res = await request(app.getHttpServer())
      .post("/api/games/upsert-external")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: ExternalGameSource.STEAM,
        externalId: `steam_${suffix}`,
        canonicalSlug: `slug-${suffix}`,
        name: `Game ${suffix}`,
        firstReleaseDate: "not-a-date",
      })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.error).toBe("Bad Request");
    const message = Array.isArray(res.body.message) ? res.body.message.join(" ") : String(res.body.message);
    expect(message).toContain("firstReleaseDate");
  });
});
