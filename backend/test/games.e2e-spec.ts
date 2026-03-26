import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ExternalGameSource, PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { IgdbService } from "../src/igdb/igdb.service";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
process.env.JWT_EXPIRES_IN_SECONDES = process.env.JWT_EXPIRES_IN_SECONDES ?? "900";

describe("Games (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let igdbMock: {
    searchCatalog: jest.Mock;
    getGameDetails: jest.Mock;
  };
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
    igdbMock = {
      searchCatalog: jest.fn(),
      getGameDetails: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IgdbService)
      .useValue(igdbMock)
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

    prisma = new PrismaClient();
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.userGame.deleteMany();
    await prisma.gameSourceTag.deleteMany();
    await prisma.gameExternalId.deleteMany();
    await prisma.game.deleteMany();
    jest.clearAllMocks();
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

  it("GET /api/games/me/library returns an empty array when the authenticated user has no owned games", async () => {
    const token = await registerAndLogin();

    const res = await request(app.getHttpServer())
      .get("/api/games/me/library")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it("POST /api/games/me/library creates the owned relation and GET /api/games/me/library returns it", async () => {
    const token = await registerAndLogin();
    const suffix = rand();
    const igdbId = `igdb_${suffix}`;
    igdbMock.getGameDetails.mockResolvedValue({
      igdbId,
      name: `Hades ${suffix}`,
      summary: "roguelike",
      coverUrl: "https://images.igdb.test/hades.jpg",
      firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      genres: [],
      themes: [],
      keywords: [],
    });

    const addRes = await request(app.getHttpServer())
      .post("/api/games/me/library")
      .set("Authorization", `Bearer ${token}`)
      .send({ igdbId })
      .expect(201);

    expect(addRes.body).toEqual({
      gameId: expect.any(String),
      igdbId,
      name: `Hades ${suffix}`,
      owned: true,
    });

    const listRes = await request(app.getHttpServer())
      .get("/api/games/me/library")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listRes.body).toEqual([
      {
        gameId: addRes.body.gameId,
        igdbId,
        name: `Hades ${suffix}`,
        summary: "roguelike",
        coverUrl: "https://images.igdb.test/hades.jpg",
        firstReleaseDate: "2020-09-17T00:00:00.000Z",
        owned: true,
        playtimeMinutes: null,
        lastSyncedAt: null,
      },
    ]);
  });

  it("POST /api/games/me/library is idempotent for the same user and IGDB id", async () => {
    const token = await registerAndLogin();
    const suffix = rand();
    const igdbId = `igdb_${suffix}`;
    igdbMock.getGameDetails.mockResolvedValue({
      igdbId,
      name: `Hades ${suffix}`,
      summary: "roguelike",
      coverUrl: "https://images.igdb.test/hades.jpg",
      firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      genres: [],
      themes: [],
      keywords: [],
    });

    const first = await request(app.getHttpServer())
      .post("/api/games/me/library")
      .set("Authorization", `Bearer ${token}`)
      .send({ igdbId })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post("/api/games/me/library")
      .set("Authorization", `Bearer ${token}`)
      .send({ igdbId })
      .expect(201);

    expect(second.body.gameId).toBe(first.body.gameId);

    const userGameCount = await prisma.userGame.count();
    const gameCount = await prisma.game.count();
    const mappingCount = await prisma.gameExternalId.count({
      where: {
        source: ExternalGameSource.IGDB,
        externalId: igdbId,
      },
    });

    expect(userGameCount).toBe(1);
    expect(gameCount).toBe(1);
    expect(mappingCount).toBe(1);
  });

  it("DELETE /api/games/me/library/:gameId removes the owned relation but keeps the canonical game", async () => {
    const token = await registerAndLogin();
    const suffix = rand();
    const igdbId = `igdb_${suffix}`;
    igdbMock.getGameDetails.mockResolvedValue({
      igdbId,
      name: `Hades ${suffix}`,
      summary: "roguelike",
      coverUrl: "https://images.igdb.test/hades.jpg",
      firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      genres: [],
      themes: [],
      keywords: [],
    });

    const addRes = await request(app.getHttpServer())
      .post("/api/games/me/library")
      .set("Authorization", `Bearer ${token}`)
      .send({ igdbId })
      .expect(201);

    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/games/me/library/${addRes.body.gameId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(deleteRes.body).toEqual({
      gameId: addRes.body.gameId,
      removed: true,
    });

    const listRes = await request(app.getHttpServer())
      .get("/api/games/me/library")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listRes.body).toEqual([]);
    expect(await prisma.game.count()).toBe(1);
    expect(await prisma.gameExternalId.count()).toBe(1);
    expect(await prisma.userGame.count()).toBe(0);
  });

  it("DELETE /api/games/me/library/:gameId returns 404 when the game is not in the user's library", async () => {
    const token = await registerAndLogin();

    const res = await request(app.getHttpServer())
      .delete("/api/games/me/library/non-existent-game")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(res.body.statusCode).toBe(404);
    expect(res.body.message).toBe("Game not found in user library");
  });
});
