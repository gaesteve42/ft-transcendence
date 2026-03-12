import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuthProvider, User as PrismaUser } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { User } from "./types/users";
import { UsersService } from "./users.service";

describe("UsersService", () => {
	let service: UsersService;
	let prisma: {
		user: {
			findUnique: jest.Mock;
			create: jest.Mock;
			update: jest.Mock;
		};
	};

	const makeDomainUser = (overrides: Partial<User> = {}): User => ({
		id: "local-user-1",
		email: "middle@test.com",
		username: "Middle",
		passwordHash: "hashed-password",
		steamId: null,
		avatarUrl: null,
		authProvider: AuthProvider.LOCAL,
		steamLinkedAt: null,
		lastSteamUpdated: null,
		...overrides,
	});

	const makePrismaUser = (overrides: Partial<PrismaUser> = {}): PrismaUser => ({
		id: "local-user-1",
		email: "middle@test.com",
		username: "Middle",
		passwordHash: "hashed-password",
		steamId: null,
		avatarUrl: null,
		authProvider: AuthProvider.LOCAL,
		steamLinkedAt: null,
		lastSteamUpdated: null,
		createdAt: new Date("2026-03-12T10:00:00.000Z"),
		updatedAt: new Date("2026-03-12T10:00:00.000Z"),
		...overrides,
	});

	beforeEach(() => {
		prisma = {
			user: {
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
			},
		};

		service = new UsersService(prisma as unknown as PrismaService);
	});

	it("throws NotFoundException when the local user does not exist", async () => {
		jest.spyOn(service, "findById").mockResolvedValue(undefined);

		await expect(
			service.linkSteamToLocalUser("local-user-1", "76561198193621067", "https://avatar.test/link.jpg"),
		).rejects.toThrow(NotFoundException);
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("refreshes the Steam profile when the same Steam account is linked to the same user", async () => {
		const localUser = makeDomainUser({
			id: "local-user-1",
			steamId: "76561198193621067",
			avatarUrl: "https://avatar.test/old.jpg",
		});
		const updatedUser = makeDomainUser({
			id: "local-user-1",
			steamId: "76561198193621067",
			avatarUrl: "https://avatar.test/new.jpg",
			lastSteamUpdated: new Date("2026-03-12T11:00:00.000Z"),
		});

		jest.spyOn(service, "findById").mockResolvedValue(localUser);
		jest.spyOn(service, "findBySteamId").mockResolvedValue(localUser);
		const updateSteamProfileSpy = jest.spyOn(service, "updateSteamProfile").mockResolvedValue(updatedUser);

		const result = await service.linkSteamToLocalUser(
			"local-user-1",
			"76561198193621067",
			"https://avatar.test/new.jpg",
		);

		// Re-linking the same Steam account must stay idempotent and only refresh Steam metadata.
		expect(updateSteamProfileSpy).toHaveBeenCalledWith(
			"local-user-1",
			"https://avatar.test/new.jpg",
			expect.any(Date),
		);
		expect(prisma.user.update).not.toHaveBeenCalled();
		expect(result).toEqual(updatedUser);
	});

	it("throws when the Steam account already belongs to another user", async () => {
		jest.spyOn(service, "findById").mockResolvedValue(makeDomainUser({ id: "local-user-1" }));
		jest.spyOn(service, "findBySteamId").mockResolvedValue(
			makeDomainUser({
				id: "steam-user-2",
				steamId: "76561198193621067",
				authProvider: AuthProvider.STEAM,
			}),
		);

		await expect(
			service.linkSteamToLocalUser("local-user-1", "76561198193621067", "https://avatar.test/link.jpg"),
		).rejects.toThrow(new BadRequestException("Steam account already linked to another user"));
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("throws when the local user is already linked to another Steam account", async () => {
		jest.spyOn(service, "findById").mockResolvedValue(
			makeDomainUser({
				id: "local-user-1",
				steamId: "76561198000000000",
			}),
		);
		jest.spyOn(service, "findBySteamId").mockResolvedValue(undefined);

		await expect(
			service.linkSteamToLocalUser("local-user-1", "76561198193621067", "https://avatar.test/link.jpg"),
		).rejects.toThrow(new BadRequestException("User already linked to another Steam account"));
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("links a local user to Steam on the first successful association", async () => {
		jest.spyOn(service, "findById").mockResolvedValue(
			makeDomainUser({
				id: "local-user-1",
				steamId: null,
				avatarUrl: null,
			}),
		);
		jest.spyOn(service, "findBySteamId").mockResolvedValue(undefined);
		prisma.user.update.mockResolvedValue(
			makePrismaUser({
				id: "local-user-1",
				steamId: "76561198193621067",
				avatarUrl: "https://avatar.test/link.jpg",
				steamLinkedAt: new Date("2026-03-12T12:00:00.000Z"),
				lastSteamUpdated: new Date("2026-03-12T12:00:00.000Z"),
			}),
		);

		const result = await service.linkSteamToLocalUser(
			"local-user-1",
			"76561198193621067",
			"https://avatar.test/link.jpg",
		);

		// First-time linking persists the Steam identity onto the already authenticated local account.
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: "local-user-1" },
			data: {
				steamId: "76561198193621067",
				avatarUrl: "https://avatar.test/link.jpg",
				steamLinkedAt: expect.any(Date),
				lastSteamUpdated: expect.any(Date),
			},
		});
		expect(result).toMatchObject({
			id: "local-user-1",
			steamId: "76561198193621067",
			avatarUrl: "https://avatar.test/link.jpg",
			authProvider: AuthProvider.LOCAL,
		});
		expect(result.steamLinkedAt).toBeInstanceOf(Date);
		expect(result.lastSteamUpdated).toBeInstanceOf(Date);
	});
});
