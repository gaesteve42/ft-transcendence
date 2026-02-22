import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { SteamAuthService } from "./steam-auth.service";
import { UsersService } from "src/users/users.service";
import { AuditLoggerService } from "src/common/logging/audit-logger.service";
import { User } from "src/users/types/users";

describe("SteamAuthService", () => {
	let service: SteamAuthService;
	let users: jest.Mocked<UsersService>;
	let jwt: jest.Mocked<JwtService>;
	let audit: jest.Mocked<AuditLoggerService>;

	const makeUser = (id: string): User => ({
		id,
		email: null,
		username: `user_${id}`,
		passwordHash: null,
		steamId: `steam_${id}`,
		avatarUrl: "https://avatar.test/a.jpg",
		authProvider: "STEAM",
		steamLinkedAt: new Date("2026-01-01T00:00:00.000Z"),
		lastSteamUpdated: null,
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SteamAuthService,
				{
					provide: UsersService,
					useValue: {
						findBySteamId: jest.fn(),
						updateSteamProfile: jest.fn(),
						createSteamUser: jest.fn(),
					},
				},
				{
					provide: JwtService,
					useValue: {
						sign: jest.fn(),
					},
				},
				{
					provide: AuditLoggerService,
					useValue: {
						log: jest.fn(),
						warn: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get(SteamAuthService);
		users = module.get(UsersService) as jest.Mocked<UsersService>;
		jwt = module.get(JwtService) as jest.Mocked<JwtService>;
		audit = module.get(AuditLoggerService) as jest.Mocked<AuditLoggerService>;
	});

	it("updates an existing steam user and returns token", async () => {
		const existing = makeUser("1");
		const updated = { ...existing, avatarUrl: "https://avatar.test/new.jpg", lastSteamUpdated: new Date() };

		users.findBySteamId.mockResolvedValue(existing);
		users.updateSteamProfile.mockResolvedValue(updated);
		jwt.sign.mockReturnValue("token-1");

		const result = await service.loginWithSteam("765", "Middle", "https://avatar.test/new.jpg");

		expect(users.findBySteamId).toHaveBeenCalledWith("765");
		expect(users.updateSteamProfile).toHaveBeenCalledTimes(1);
		expect(users.createSteamUser).not.toHaveBeenCalled();
		expect(jwt.sign).toHaveBeenCalledWith({ sub: updated.id });
		expect(result).toEqual({ accessToken: "token-1" });
	});

	it("creates a new steam user and returns token", async () => {
		const created = makeUser("2");

		users.findBySteamId.mockResolvedValue(undefined);
		users.createSteamUser.mockResolvedValue(created);
		jwt.sign.mockReturnValue("token-2");

		const result = await service.loginWithSteam("999", "Middle", "https://avatar.test/a.jpg");

		expect(users.findBySteamId).toHaveBeenCalledWith("999");
		expect(users.createSteamUser).toHaveBeenCalledWith({
			steamId: "999",
			username: "Middle",
			avatarUrl: "https://avatar.test/a.jpg",
		});
		expect(users.updateSteamProfile).not.toHaveBeenCalled();
		expect(result).toEqual({ accessToken: "token-2" });
	});

	it("logs and rethrows unexpected errors", async () => {
		const err = new Error("db down");
		users.findBySteamId.mockRejectedValue(err);

		await expect(service.loginWithSteam("123", "Middle", "https://avatar.test/a.jpg")).rejects.toThrow("db down");
		expect(audit.warn).toHaveBeenCalledWith("auth.steam.login.fail", {
			steamId: "123",
			reason: "unexpected_error",
		});
	});
});
