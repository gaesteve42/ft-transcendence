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
						linkSteamToLocalUser: jest.fn(),
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

	it("createLinkIntent then consumeLinkIntent returns the local userId once", () => {
		// L'intent sert de pont temporaire entre la session locale et le callback OAuth Steam.
		const intentId = service.createLinkIntent("local-user-1");

		expect(service.consumeLinkIntent(intentId)).toBe("local-user-1");
		expect(() => service.consumeLinkIntent(intentId)).toThrow(UnauthorizedException);
	});

	it("consumeLinkIntent rejects expired intent", () => {
		const nowSpy = jest.spyOn(Date, "now");
		nowSpy.mockReturnValue(5_000);
		const intentId = service.createLinkIntent("local-user-1");
		nowSpy.mockReturnValue(5_000 + 61_000);

		expect(() => service.consumeLinkIntent(intentId)).toThrow(UnauthorizedException);

		nowSpy.mockRestore();
	});

	it("createLinkIntent rejects a blank local userId", () => {
		expect(() => service.createLinkIntent("   ")).toThrow(BadRequestException);
	});

	it("consumeLinkIntent rejects an empty intent id", () => {
		expect(() => service.consumeLinkIntent("   ")).toThrow(BadRequestException);
	});

	it("consumeLinkIntent rejects an unknown intent id", () => {
		expect(() => service.consumeLinkIntent("unknown-intent")).toThrow(UnauthorizedException);
	});

	it("linkSteamAccount trims ids and delegates to UsersService", async () => {
		users.linkSteamToLocalUser.mockResolvedValue(makeUser("local-user-1"));

		const result = await service.linkSteamAccount(
			"  local-user-1  ",
			"  76561198193621067  ",
			"https://avatar.test/link.jpg",
		);

		expect(users.linkSteamToLocalUser).toHaveBeenCalledWith(
			"local-user-1",
			"76561198193621067",
			"https://avatar.test/link.jpg",
		);
		expect(result).toEqual({ userId: "local-user-1" });
	});

	it("linkSteamAccount rejects a blank local userId", async () => {
		await expect(
			service.linkSteamAccount("   ", "76561198193621067", "https://avatar.test/link.jpg"),
		).rejects.toThrow(BadRequestException);
		expect(users.linkSteamToLocalUser).not.toHaveBeenCalled();
	});

	it("linkSteamAccount rejects a blank Steam ID", async () => {
		await expect(
			service.linkSteamAccount("local-user-1", "   ", "https://avatar.test/link.jpg"),
		).rejects.toThrow(BadRequestException);
		expect(users.linkSteamToLocalUser).not.toHaveBeenCalled();
	});

	it("linkSteamAccount propagates user linking errors", async () => {
		const err = new BadRequestException("Steam account already linked to another user");
		users.linkSteamToLocalUser.mockRejectedValue(err);

		await expect(
			service.linkSteamAccount("local-user-1", "76561198193621067", "https://avatar.test/link.jpg"),
		).rejects.toBe(err);
	});
});
