import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { SteamAuthService } from "./steam-auth.service";
import { UsersService } from "src/users/users.service";
import { AuditLoggerService } from "src/common/logging/audit-logger.service";
import { User } from "src/users/types/users";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

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

	it("updates an existing steam user and returns userId", async () => {
		const existing = makeUser("1");
		const updated = { ...existing, avatarUrl: "https://avatar.test/new.jpg", lastSteamUpdated: new Date() };

		users.findBySteamId.mockResolvedValue(existing);
		users.updateSteamProfile.mockResolvedValue(updated);

		const result = await service.loginWithSteam("765", "Middle", "https://avatar.test/new.jpg");

		expect(users.findBySteamId).toHaveBeenCalledWith("765");
		expect(users.updateSteamProfile).toHaveBeenCalledTimes(1);
		expect(users.createSteamUser).not.toHaveBeenCalled();
		expect(result).toEqual({ userId: updated.id });
	});

	it("creates a new steam user and returns userId", async () => {
		const created = makeUser("2");

		users.findBySteamId.mockResolvedValue(undefined);
		users.createSteamUser.mockResolvedValue(created);

		const result = await service.loginWithSteam("999", "Middle", "https://avatar.test/a.jpg");

		expect(users.findBySteamId).toHaveBeenCalledWith("999");
		expect(users.createSteamUser).toHaveBeenCalledWith({
			steamId: "999",
			username: "Middle",
			avatarUrl: "https://avatar.test/a.jpg",
		});
		expect(users.updateSteamProfile).not.toHaveBeenCalled();
		expect(result).toEqual({ userId: created.id });
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

	it("createCode then exchangeCode returns an access token", () => {
		jwt.sign.mockReturnValue("jwt-1");

		const code = service.createCode("user-123");
		const result = service.exchangeCode(code);

		expect(jwt.sign).toHaveBeenCalledWith({ sub: "user-123" });
		expect(result).toEqual({ accessToken: "jwt-1" });
	});

	it("consumeCode rejects empty code", () => {
		expect(() => service.consumeCode("   ")).toThrow(BadRequestException);
	});

	it("consumeCode rejects invalid code", () => {
		expect(() => service.consumeCode("unknown-code")).toThrow(UnauthorizedException);
	});

	it("consumeCode rejects expired code", () => {
		const nowSpy = jest.spyOn(Date, "now");
		nowSpy.mockReturnValue(1_000);
		const code = service.createCode("user-123");
		nowSpy.mockReturnValue(1_000 + 61_000);

		expect(() => service.consumeCode(code)).toThrow(UnauthorizedException);

		nowSpy.mockRestore();
	});

	it("consumeCode is one-time: second use fails", () => {
		const code = service.createCode("user-123");

		const first = service.consumeCode(code);
		expect(first).toBe("user-123");
		expect(() => service.consumeCode(code)).toThrow(UnauthorizedException);
	});
});
