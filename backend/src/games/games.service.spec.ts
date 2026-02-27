import { BadRequestException } from "@nestjs/common";
import { ExternalGameSource, Game as PrismaGame } from "@prisma/client";
import { GameService } from "./games.service";

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

describe("GameService", () => {
    let service: GameService;
    let prisma: {
      gameExternalId: {
        findUnique: jest.Mock;
        create: jest.Mock;
      };
      game: {
        create: jest.Mock;
      };
  };

  beforeEach(() => {
      prisma = {
        gameExternalId: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
        game: {
          create: jest.fn(),
        },
      };
      service = new GameService(prisma as any);
      jest.clearAllMocks();
  });

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

    // Verifies idempotency: if mapping exists, no creation/linking should happen.
    it("returns existing game without creating when mapping already exists", async () => {
      const existing = {
        id: "game-1",
        canonicalSlug: "hades",
        name: "Hades",
        summary: "roguelike",
        coverUrl: "https://example.com/hades.jpg",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      };
      jest.spyOn(service, "findByExternalId").mockResolvedValue(existing);
      const createSpy = jest.spyOn(service, "createCanonicalGame");
      const linkSpy = jest.spyOn(service, "linkExternalId");

      const result = await service.upsertFromExternal(input);

      expect(result).toEqual(existing);
      expect(createSpy).not.toHaveBeenCalled();
      expect(linkSpy).not.toHaveBeenCalled();
    });

    // Verifies full creation flow when mapping does not exist yet.
    it("creates and links game when mapping does not exist", async () => {
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
      const createSpy = jest.spyOn(service, "createCanonicalGame").mockResolvedValue(created);
      const linkSpy = jest.spyOn(service, "linkExternalId").mockResolvedValue();

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
    });

    // Verifies race-condition recovery: on unique conflict, re-read and return resolved game.
    it("handles unique conflict race by re-reading mapping and returning resolved game", async () => {
      const uniqueError = new Error("race conflict");
      const resolved = {
        id: "game-3",
        canonicalSlug: "hades",
        name: "Hades",
        summary: "roguelike",
        coverUrl: "https://example.com/hades.jpg",
        firstReleaseDate: new Date("2020-09-17T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      };

      jest
        .spyOn(service, "findByExternalId")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(resolved);
      jest.spyOn(service, "createCanonicalGame").mockRejectedValue(uniqueError);
      jest.spyOn(service as any, "isUniqueConstraintError").mockReturnValue(true);

      const result = await service.upsertFromExternal(input);

      expect(result).toEqual(resolved);
    });

    // Verifies race-condition fallback: if re-read still fails, original error is rethrown.
    it("rethrows unique error when race re-read still finds nothing", async () => {
      const uniqueError = new Error("race conflict unresolved");

      jest.spyOn(service, "findByExternalId").mockResolvedValueOnce(null).mockResolvedValueOnce(null);
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
});
