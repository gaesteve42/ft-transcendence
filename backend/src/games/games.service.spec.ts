import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ExternalGameSource, Game as PrismaGame } from "@prisma/client";
import { GameService } from "./games.service";
import { IgdbService } from "src/igdb/igdb.service";

const makePrismaGame = (overrides: Partial<PrismaGame> = {}): PrismaGame => ({
      id: "game-1",
      canonicalSlug: "hades",
      name: "Hades",
      summary: "roguelike",
      coverUrl: "https://example.com/hades.jpg",
      firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      ...overrides,
});

/**
 * Unit tests for GameService.
 * Covers canonical game CRUD, external ID mapping, upsert-from-external idempotency,
 * race-condition recovery, user game library operations, and metadata enrichment.
 */
describe("GameService", () => {
    let service: GameService;
    let prisma: {
      gameExternalId: {
        findUnique: jest.Mock;
        create: jest.Mock;
      };
      game: {
        create: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
      };
      userGame: {
        findMany: jest.Mock;
        upsert: jest.Mock;
        findUnique: jest.Mock;
        delete: jest.Mock;
      };
  };
	let igdbService: {
		getGameDetails: jest.Mock;
	};

  beforeEach(() => {
      prisma = {
        gameExternalId: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
        game: {
          create: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        userGame: {
          findMany: jest.fn(),
          upsert: jest.fn(),
          findUnique: jest.fn(),
          delete: jest.fn(),
        },
      };
      igdbService = {
        getGameDetails: jest.fn(),
      };
      service = new GameService(prisma as any, igdbService as unknown as IgdbService);
      jest.clearAllMocks();
  });

  // Tests for resolving a canonical game from an external source + ID pair.
  describe("findByExternalId", () => {
    // Verifies the "not found" path: external mapping does not exist yet.
    it("returns null when external mapping is missing", async () => {
        prisma.gameExternalId.findUnique.mockResolvedValue(null);

        const result = await service.findByExternalId(ExternalGameSource.STEAM, "1145360");

        expect(result).toBeNull();
        expect(prisma.gameExternalId.findUnique).toHaveBeenCalledWith({
          where: {
            source_externalId: { source: ExternalGameSource.STEAM, externalId: "1145360" },
          },
          select: { game: true },
        });
      });
    // Verifies successful lookup: mapping exists and must return a domain Game.
    it("returns domain game when mapping exists", async () => {
        const prismaGame = makePrismaGame();
        prisma.gameExternalId.findUnique.mockResolvedValue({ game: prismaGame });

        const result = await service.findByExternalId(ExternalGameSource.IGDB, "12345");

        expect(result).toEqual({
          id: prismaGame.id,
          canonicalSlug: prismaGame.canonicalSlug,
          name: prismaGame.name,
          summary: prismaGame.summary,
          coverUrl: prismaGame.coverUrl,
          firstReleaseDate: prismaGame.firstReleaseDate,
          createdAt: prismaGame.createdAt,
          updatedAt: prismaGame.updatedAt,
        });
      });
  });

  // Tests for creating a new canonical game entry with input normalization.
  describe("createCanonicalGame", () => {
    // Verifies data normalization before insert (slug, trims, empty optional fields -> null).
    it("normalizes slug, trims fields, and converts empty optional strings to null", async () => {
      const created = makePrismaGame({
        canonicalSlug: "counter-strike-2",
        name: "Counter-Strike 2",
        summary: null,
        coverUrl: null,
      });
      prisma.game.create.mockResolvedValue(created);

      const result = await service.createCanonicalGame(
        "  Côunter   Strike 2  ",
        "  Counter-Strike 2  ",
        "   ",
        "   ",
        null,
      );

      expect(prisma.game.create).toHaveBeenCalledWith({
        data: {
          canonicalSlug: "counter-strike-2",
          name: "Counter-Strike 2",
          summary: null,
          coverUrl: null,
          firstReleaseDate: null,
        },
      });
      expect(result).toEqual({
        id: created.id,
        canonicalSlug: created.canonicalSlug,
        name: created.name,
        summary: created.summary,
        coverUrl: created.coverUrl,
        firstReleaseDate: created.firstReleaseDate,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });
    });

    // Verifies required-field validation: name cannot be blank after trim.
    it("throws BadRequestException when name is empty after trim", async () => {
      await expect(
        service.createCanonicalGame("valid-slug", "   ", null, null, null),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.game.create).not.toHaveBeenCalled();
    });

    // Verifies slug normalization safety: invalid slug input must be rejected.
    it("throws BadRequestException when canonical slug is invalid after normalization", async () => {
      await expect(service.createCanonicalGame(" !!! ", "Game", null, null, null)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.game.create).not.toHaveBeenCalled();
    });

    // Verifies DB unique conflicts are mapped to a business-level BadRequest error.
    it("translates unique constraint errors to BadRequestException", async () => {
      const dbError = new Error("duplicate");
      prisma.game.create.mockRejectedValue(dbError);
      jest.spyOn(service as any, "isUniqueConstraintError").mockReturnValue(true);

      await expect(service.createCanonicalGame("hades", "Hades", null, null, null)).rejects.toThrow(
        new BadRequestException("Canonical Game already exists"),
      );
    });

    // Verifies unexpected DB errors are not swallowed and are rethrown as-is.
    it("rethrows non-unique errors", async () => {
      const dbError = new Error("db down");
      prisma.game.create.mockRejectedValue(dbError);
      jest.spyOn(service as any, "isUniqueConstraintError").mockReturnValue(false);

      await expect(service.createCanonicalGame("hades", "Hades", null, null, null)).rejects.toBe(dbError);
    });
  });

  // Tests for associating an external source ID with an existing canonical game.
  describe("linkExternalId", () => {
    // Verifies mapping creation sanitizes inputs and converts empty URL to null.
    it("creates external mapping with trimmed values and null URL when empty", async () => {
      prisma.gameExternalId.create.mockResolvedValue({});

      await service.linkExternalId("  game-1  ", ExternalGameSource.STEAM, "  1145360  ", "   ");

      expect(prisma.gameExternalId.create).toHaveBeenCalledWith({
        data: {
          gameId: "game-1",
          source: ExternalGameSource.STEAM,
          externalId: "1145360",
          externalUrl: null,
        },
      });
    });

    // Verifies required identifiers validation for linking external IDs.
    it("throws BadRequestException when ids are empty after trim", async () => {
      await expect(service.linkExternalId("   ", ExternalGameSource.STEAM, "   ", null)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.gameExternalId.create).not.toHaveBeenCalled();
    });

    // Verifies unique mapping collisions become a clear business BadRequest.
    it("translates unique constraint errors to BadRequestException", async () => {
      const dbError = new Error("duplicate external id");
      prisma.gameExternalId.create.mockRejectedValue(dbError);
      jest.spyOn(service as any, "isUniqueConstraintError").mockReturnValue(true);

      await expect(
        service.linkExternalId("game-1", ExternalGameSource.STEAM, "1145360", null),
      ).rejects.toThrow(new BadRequestException("External Id is already linked."));
    });

    // Verifies non-unique DB failures are propagated.
    it("rethrows non-unique errors", async () => {
      const dbError = new Error("network issue");
      prisma.gameExternalId.create.mockRejectedValue(dbError);
      jest.spyOn(service as any, "isUniqueConstraintError").mockReturnValue(false);

      await expect(
        service.linkExternalId("game-1", ExternalGameSource.STEAM, "1145360", null),
      ).rejects.toBe(dbError);
    });
  });

  // Tests for the composite upsert flow: find-or-create canonical game + link external ID.
  describe("upsertFromExternal", () => {
    const input = {
      source: ExternalGameSource.STEAM,
      externalId: "1145360",
      externalUrl: "https://store.steampowered.com/app/1145360",
      canonicalSlug: "hades",
      name: "Hades",
      summary: "roguelike",
      coverUrl: "https://example.com/hades.jpg",
      firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
    };

    // Verifies idempotency: if mapping exists, no creation/linking should happen,
    // but the canonical game can still be enriched if this source brings missing metadata.
    it("returns an enriched existing game without recreating when mapping already exists", async () => {
      const existing = {
        id: "game-1",
        canonicalSlug: "hades",
        name: "Hades",
        summary: null,
        coverUrl: "https://example.com/hades.jpg",
        firstReleaseDate: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      };
      const enriched = {
        ...existing,
        summary: "roguelike",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      };
      jest.spyOn(service, "findByExternalId").mockResolvedValue(existing);
      const enrichSpy = jest.spyOn(service, "enrichCanonicalGameIfMissing").mockResolvedValue(enriched);
      const createSpy = jest.spyOn(service, "createCanonicalGame");
      const linkSpy = jest.spyOn(service, "linkExternalId");

      const result = await service.upsertFromExternal(input);

      expect(result).toEqual(enriched);
      expect(enrichSpy).toHaveBeenCalledWith(existing.id, {
        summary: input.summary,
        coverUrl: input.coverUrl,
        firstReleaseDate: input.firstReleaseDate,
      });
      expect(createSpy).not.toHaveBeenCalled();
      expect(linkSpy).not.toHaveBeenCalled();
    });

    // Verifies full creation flow when neither canonical game nor mapping exist yet.
    it("creates and links game when mapping and canonical game do not exist", async () => {
      const created = {
        id: "game-2",
        canonicalSlug: "hades",
        name: "Hades",
        summary: "roguelike",
        coverUrl: "https://example.com/hades.jpg",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      };
      jest.spyOn(service, "findByExternalId").mockResolvedValue(null);
      jest.spyOn(service, "findByCanonicalSlug").mockResolvedValue(null);
      const createSpy = jest.spyOn(service, "createCanonicalGame").mockResolvedValue(created);
      const linkSpy = jest.spyOn(service, "linkExternalId").mockResolvedValue();
      const enrichSpy = jest.spyOn(service, "enrichCanonicalGameIfMissing");

      const result = await service.upsertFromExternal(input);

      expect(result).toEqual(created);
      expect(createSpy).toHaveBeenCalledWith(
        input.canonicalSlug,
        input.name,
        input.summary,
        input.coverUrl,
        input.firstReleaseDate,
      );
      expect(linkSpy).toHaveBeenCalledWith(created.id, input.source, input.externalId, input.externalUrl);
      expect(enrichSpy).not.toHaveBeenCalled();
    });

    // Verifies the path where the canonical game exists by slug but the external mapping is new.
    it("links and enriches an existing canonical game when external mapping is missing", async () => {
      const canonical = {
        id: "game-2",
        canonicalSlug: "hades",
        name: "Hades",
        summary: null,
        coverUrl: "https://steam.test/hades.jpg",
        firstReleaseDate: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      };
      const enriched = {
        ...canonical,
        summary: "roguelike",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      };

      jest.spyOn(service, "findByExternalId").mockResolvedValue(null);
      jest.spyOn(service, "findByCanonicalSlug").mockResolvedValue(canonical);
      const linkSpy = jest.spyOn(service, "linkExternalId").mockResolvedValue();
      const enrichSpy = jest.spyOn(service, "enrichCanonicalGameIfMissing").mockResolvedValue(enriched);

      const result = await service.upsertFromExternal(input);

      expect(linkSpy).toHaveBeenCalledWith(canonical.id, input.source, input.externalId, input.externalUrl);
      expect(enrichSpy).toHaveBeenCalledWith(canonical.id, {
        summary: input.summary,
        coverUrl: input.coverUrl,
        firstReleaseDate: input.firstReleaseDate,
      });
      expect(result).toEqual(enriched);
    });

    // Verifies race-condition recovery: on unique conflict, re-read and return resolved game.
    it("handles unique conflict race by re-reading mapping and enriching the resolved game", async () => {
      const uniqueError = new Error("race conflict");
      const resolved = {
        id: "game-3",
        canonicalSlug: "hades",
        name: "Hades",
        summary: null,
        coverUrl: "https://example.com/hades.jpg",
        firstReleaseDate: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      };
      const enriched = {
        ...resolved,
        summary: "roguelike",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      };

      jest
        .spyOn(service, "findByExternalId")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(resolved);
      jest.spyOn(service, "createCanonicalGame").mockRejectedValue(uniqueError);
      const enrichSpy = jest.spyOn(service, "enrichCanonicalGameIfMissing").mockResolvedValue(enriched);
      jest.spyOn(service as any, "isUniqueConstraintError").mockReturnValue(true);

      const result = await service.upsertFromExternal(input);

      expect(enrichSpy).toHaveBeenCalledWith(resolved.id, {
        summary: input.summary,
        coverUrl: input.coverUrl,
        firstReleaseDate: input.firstReleaseDate,
      });
      expect(result).toEqual(enriched);
    });

    // Verifies race-condition recovery when the mapping is still missing after conflict.
    it("handles unique conflict race by linking and enriching the canonical game when mapping still does not exist", async () => {
      const uniqueError = new Error("race conflict unresolved");
      const canonical = {
        id: "game-4",
        canonicalSlug: "hades",
        name: "Hades",
        summary: null,
        coverUrl: "https://steam.test/hades.jpg",
        firstReleaseDate: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      };
      const enriched = {
        ...canonical,
        summary: "roguelike",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      };

      jest.spyOn(service, "findByExternalId").mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      jest.spyOn(service, "findByCanonicalSlug").mockResolvedValue(canonical);
      jest.spyOn(service, "createCanonicalGame").mockRejectedValue(uniqueError);
      const linkSpy = jest.spyOn(service, "linkExternalId").mockResolvedValue();
      const enrichSpy = jest.spyOn(service, "enrichCanonicalGameIfMissing").mockResolvedValue(enriched);
      jest.spyOn(service as any, "isUniqueConstraintError").mockReturnValue(true);

      const result = await service.upsertFromExternal(input);

      expect(linkSpy).toHaveBeenCalledWith(canonical.id, input.source, input.externalId, input.externalUrl);
      expect(enrichSpy).toHaveBeenCalledWith(canonical.id, {
        summary: input.summary,
        coverUrl: input.coverUrl,
        firstReleaseDate: input.firstReleaseDate,
      });
      expect(result).toEqual(enriched);
    });

    // Verifies race-condition fallback: if re-read still fails, original error is rethrown.
    it("rethrows unique error when race recovery cannot resolve either mapping or canonical game", async () => {
      const uniqueError = new Error("race conflict unresolved");

      jest.spyOn(service, "findByExternalId").mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      jest.spyOn(service, "findByCanonicalSlug").mockResolvedValue(null);
      jest.spyOn(service, "createCanonicalGame").mockRejectedValue(uniqueError);
      jest.spyOn(service as any, "isUniqueConstraintError").mockReturnValue(true);

      await expect(service.upsertFromExternal(input)).rejects.toBe(uniqueError);
    });

    // Verifies non-unique errors in upsert path are rethrown.
    it("rethrows non-unique errors", async () => {
      const dbError = new Error("downstream failure");

      jest.spyOn(service, "findByExternalId").mockResolvedValueOnce(null);
      jest.spyOn(service, "createCanonicalGame").mockRejectedValue(dbError);
      jest.spyOn(service as any, "isUniqueConstraintError").mockReturnValue(false);

      await expect(service.upsertFromExternal(input)).rejects.toBe(dbError);
    });
  });

  // Tests for looking up a canonical game by its normalized slug.
  describe("findByCanonicalSlug", () => {
    it("returns null when the canonical game does not exist", async () => {
      prisma.game.findUnique.mockResolvedValue(null);

      const result = await service.findByCanonicalSlug("Hades");

      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { canonicalSlug: "hades" },
      });
      expect(result).toBeNull();
    });

    it("returns the canonical game as a domain object when it exists", async () => {
      const prismaGame = makePrismaGame();
      prisma.game.findUnique.mockResolvedValue(prismaGame);

      const result = await service.findByCanonicalSlug("Hades");

      expect(result).toEqual({
        id: prismaGame.id,
        canonicalSlug: prismaGame.canonicalSlug,
        name: prismaGame.name,
        summary: prismaGame.summary,
        coverUrl: prismaGame.coverUrl,
        firstReleaseDate: prismaGame.firstReleaseDate,
        createdAt: prismaGame.createdAt,
        updatedAt: prismaGame.updatedAt,
      });
    });
  });

  // Tests for selectively filling missing metadata on an existing canonical game.
  describe("enrichCanonicalGameIfMissing", () => {
    it("throws when game id is blank", async () => {
      await expect(
        service.enrichCanonicalGameIfMissing("   ", {
          summary: "roguelike",
          coverUrl: "https://images.igdb.test/hades.jpg",
          firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
        }),
      ).rejects.toThrow(new BadRequestException("Game ID is required"));
    });

    it("throws when the canonical game cannot be found", async () => {
      prisma.game.findUnique.mockResolvedValue(null);

      await expect(
        service.enrichCanonicalGameIfMissing("game-1", {
          summary: "roguelike",
          coverUrl: "https://images.igdb.test/hades.jpg",
          firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
        }),
      ).rejects.toThrow(new NotFoundException("Game not found"));
    });

    it("returns the existing game unchanged when there is nothing to enrich", async () => {
      const existing = makePrismaGame({
        summary: "already present",
        coverUrl: "https://steam.test/hades.jpg",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      });
      prisma.game.findUnique.mockResolvedValue(existing);

      const result = await service.enrichCanonicalGameIfMissing("game-1", {
        summary: "new summary",
        coverUrl: "https://images.igdb.test/hades.jpg",
        firstReleaseDate: new Date("2020-09-18T00:00:00.000Z"),
      });

      expect(prisma.game.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: existing.id,
        canonicalSlug: existing.canonicalSlug,
        name: existing.name,
        summary: existing.summary,
        coverUrl: existing.coverUrl,
        firstReleaseDate: existing.firstReleaseDate,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      });
    });

    it("fills only missing metadata and preserves an existing Steam cover", async () => {
      const existing = makePrismaGame({
        summary: null,
        coverUrl: "https://steam.test/hades.jpg",
        firstReleaseDate: null,
      });
      const updated = makePrismaGame({
        summary: "roguelike",
        coverUrl: "https://steam.test/hades.jpg",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      });
      prisma.game.findUnique.mockResolvedValue(existing);
      prisma.game.update.mockResolvedValue(updated);

      const result = await service.enrichCanonicalGameIfMissing("game-1", {
        summary: "roguelike",
        coverUrl: "https://images.igdb.test/hades.jpg",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      });

      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: "game-1" },
        data: {
          summary: "roguelike",
          firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
        },
      });
      expect(result).toEqual({
        id: updated.id,
        canonicalSlug: updated.canonicalSlug,
        name: updated.name,
        summary: updated.summary,
        coverUrl: updated.coverUrl,
        firstReleaseDate: updated.firstReleaseDate,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    });
  });

  // Tests for listing a user's owned game library.
  describe("listOwnedGamesForUser", () => {
    it("throws when user id is blank", async () => {
      await expect(service.listOwnedGamesForUser("   ")).rejects.toThrow(
        new BadRequestException("User ID is required"),
      );
    });

    it("returns the owned library sorted from the Prisma query and resolves the IGDB mapping", async () => {
      const firstReleaseDate = new Date("2020-09-17T00:00:00.000Z");
      const lastSyncedAt = new Date("2026-03-12T17:56:37.611Z");
      prisma.userGame.findMany.mockResolvedValue([
        {
          userId: "user-1",
          gameId: "game-1",
          owned: true,
          playtimeMinutes: 2810,
          lastSyncedAt,
          createdAt: new Date("2026-03-12T17:56:37.611Z"),
          updatedAt: new Date("2026-03-13T17:56:37.611Z"),
          game: {
            id: "game-1",
            canonicalSlug: "hades",
            name: "Hades",
            summary: "roguelike",
            coverUrl: "https://steam.test/hades.jpg",
            firstReleaseDate,
            createdAt: new Date("2026-03-12T17:56:37.611Z"),
            updatedAt: new Date("2026-03-13T17:56:37.611Z"),
            externalIds: [
              {
                id: "ext-1",
                gameId: "game-1",
                source: ExternalGameSource.STEAM,
                externalId: "1145360",
                externalUrl: "https://store.steampowered.com/app/1145360",
                createdAt: new Date("2026-03-12T17:56:37.611Z"),
                updatedAt: new Date("2026-03-13T17:56:37.611Z"),
              },
              {
                id: "ext-2",
                gameId: "game-1",
                source: ExternalGameSource.IGDB,
                externalId: "113112",
                externalUrl: null,
                createdAt: new Date("2026-03-12T17:56:37.611Z"),
                updatedAt: new Date("2026-03-13T17:56:37.611Z"),
              },
            ],
          },
        },
      ]);

      const result = await service.listOwnedGamesForUser("user-1");

      expect(prisma.userGame.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          owned: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          game: {
            include: {
              externalIds: true,
            },
          },
        },
      });
      expect(result).toEqual([
        {
          gameId: "game-1",
          igdbId: "113112",
          name: "Hades",
          summary: "roguelike",
          coverUrl: "https://steam.test/hades.jpg",
          firstReleaseDate,
          owned: true,
          playtimeMinutes: 2810,
          lastSyncedAt,
        },
      ]);
    });
  });

  // Tests for manually adding a game to a user's library via IGDB ID.
  describe("addOwnedGameForUser", () => {
    it("throws when user id is blank", async () => {
      await expect(service.addOwnedGameForUser("   ", "113112")).rejects.toThrow(
        new BadRequestException("User ID is required"),
      );
    });

    it("throws when igdb id is blank", async () => {
      await expect(service.addOwnedGameForUser("user-1", "   ")).rejects.toThrow(
        new BadRequestException("IGDB Game ID is required"),
      );
    });

    it("resolves IGDB details, upserts the canonical game, and links it to the user", async () => {
      igdbService.getGameDetails.mockResolvedValue({
        igdbId: "113112",
        name: "Hades",
        summary: "roguelike",
        coverUrl: "https://images.igdb.test/hades.jpg",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
        genres: [],
        themes: [],
        keywords: [],
      });
      const canonicalGame = {
        id: "game-1",
        canonicalSlug: "hades",
        name: "Hades",
        summary: "roguelike",
        coverUrl: "https://images.igdb.test/hades.jpg",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      };
      const upsertSpy = jest.spyOn(service, "upsertFromExternal").mockResolvedValue(canonicalGame);
      prisma.userGame.upsert.mockResolvedValue({});

      const result = await service.addOwnedGameForUser("user-1", "113112");

      expect(igdbService.getGameDetails).toHaveBeenCalledWith("113112");
      expect(upsertSpy).toHaveBeenCalledWith({
        source: ExternalGameSource.IGDB,
        externalId: "113112",
        externalUrl: null,
        canonicalSlug: "Hades",
        name: "Hades",
        summary: "roguelike",
        coverUrl: "https://images.igdb.test/hades.jpg",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
      });
      expect(prisma.userGame.upsert).toHaveBeenCalledWith({
        where: {
          userId_gameId: {
            userId: "user-1",
            gameId: "game-1",
          },
        },
        update: {
          owned: true,
        },
        create: {
          userId: "user-1",
          gameId: "game-1",
          owned: true,
        },
      });
      expect(result).toEqual({
        gameId: "game-1",
        igdbId: "113112",
        name: "Hades",
        owned: true,
      });
    });
  });

  // Tests for removing a game from a user's library.
  describe("removeOwnedGameForUser", () => {
    it("throws when user id is blank", async () => {
      await expect(service.removeOwnedGameForUser("   ", "game-1")).rejects.toThrow(
        new BadRequestException("User ID is required"),
      );
    });

    it("throws when game id is blank", async () => {
      await expect(service.removeOwnedGameForUser("user-1", "   ")).rejects.toThrow(
        new BadRequestException("Game ID is required"),
      );
    });

    it("throws when the game is not in the user's library", async () => {
      prisma.userGame.findUnique.mockResolvedValue(null);

      await expect(service.removeOwnedGameForUser("user-1", "game-1")).rejects.toThrow(
        new NotFoundException("Game not found in user library"),
      );
      expect(prisma.userGame.delete).not.toHaveBeenCalled();
    });

    it("deletes the user-game relation and returns a compact success payload", async () => {
      prisma.userGame.findUnique.mockResolvedValue({
        userId: "user-1",
        gameId: "game-1",
        owned: true,
        playtimeMinutes: null,
        lastSyncedAt: null,
        createdAt: new Date("2026-03-12T17:56:37.611Z"),
        updatedAt: new Date("2026-03-13T17:56:37.611Z"),
      });
      prisma.userGame.delete.mockResolvedValue({});

      const result = await service.removeOwnedGameForUser("user-1", "game-1");

      expect(prisma.userGame.findUnique).toHaveBeenCalledWith({
        where: {
          userId_gameId: {
            userId: "user-1",
            gameId: "game-1",
          },
        },
      });
      expect(prisma.userGame.delete).toHaveBeenCalledWith({
        where: {
          userId_gameId: {
            userId: "user-1",
            gameId: "game-1",
          },
        },
      });
      expect(result).toEqual({
        gameId: "game-1",
        removed: true,
      });
    });
  });
});
