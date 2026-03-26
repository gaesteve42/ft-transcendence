import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SteamAuthService } from "./steam-auth.service";
import { ConfigService } from "@nestjs/config";
import { InternalServerErrorException } from "@nestjs/common";

describe("AuthController", () => {
	let controller: AuthController;
	let authService: jest.Mocked<AuthService>;
	let steamAuthService: jest.Mocked<SteamAuthService>;
	let configService: { get: jest.Mock };

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{
					provide: AuthService,
					useValue: {
						register: jest.fn(),
						login: jest.fn(),
					},
				},
				{
					provide: SteamAuthService,
					useValue: {
						loginWithSteam: jest.fn(),
						linkSteamAccount: jest.fn(),
						createLinkIntent: jest.fn(),
						consumeLinkIntent: jest.fn(),
						createCode: jest.fn(),
						exchangeCode: jest.fn(),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get(AuthController);
		authService = module.get(AuthService) as jest.Mocked<AuthService>;
		steamAuthService = module.get(SteamAuthService) as jest.Mocked<SteamAuthService>;
		configService = module.get(ConfigService) as { get: jest.Mock };
	});

	it("delegates register to AuthService", async () => {
		authService.register.mockResolvedValue({ accessToken: "token" });

		const result = await controller.register({
			email: "a@test.com",
			username: "user",
			password: "Str0ngP@ssw0rd!",
		});

		expect(authService.register).toHaveBeenCalled();
		expect(result).toEqual({ accessToken: "token" });
	});

	it("delegates login to AuthService", async () => {
		authService.login.mockResolvedValue({ accessToken: "token-login" });

		const result = await controller.login({
			email: "a@test.com",
			password: "Str0ngP@ssw0rd!",
		});

		expect(authService.login).toHaveBeenCalled();
		expect(result).toEqual({ accessToken: "token-login" });
	});

	it("steamReturn redirects frontend with one-time code", async () => {
		steamAuthService.loginWithSteam.mockResolvedValue({ userId: "user-1" });
		steamAuthService.createCode.mockReturnValue("code-1");
		configService.get.mockReturnValue("https://localhost");
		const redirect = jest.fn();
		const clearCookie = jest.fn();
		const res = { redirect, clearCookie } as unknown as {
			redirect: jest.Mock;
			clearCookie: jest.Mock;
		};

		await controller.steamReturn(
			{
				user: {
					steamId: "76561198193621067",
					username: "Middle",
					avatarUrl: "https://avatars.test/full.jpg",
				},
			},
			res as never,
		);

		expect(steamAuthService.loginWithSteam).toHaveBeenCalledWith(
			"76561198193621067",
			"Middle",
			"https://avatars.test/full.jpg",
		);
		expect(steamAuthService.createCode).toHaveBeenCalledWith("user-1");
		expect(clearCookie).toHaveBeenCalledWith("steam_link_intent", {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
		});
		expect(redirect).toHaveBeenCalledWith(
			302,
			"https://localhost/auth/callback?code=code-1",
		);
	});

	it("steamReturn links the current local user when a steam link intent cookie exists", async () => {
		steamAuthService.consumeLinkIntent.mockReturnValue("local-user-1");
		steamAuthService.linkSteamAccount.mockResolvedValue({ userId: "local-user-1" });
		steamAuthService.createCode.mockReturnValue("link-code-1");
		configService.get.mockReturnValue("https://localhost");
		const redirect = jest.fn();
		const clearCookie = jest.fn();
		const res = { redirect, clearCookie } as unknown as {
			redirect: jest.Mock;
			clearCookie: jest.Mock;
		};

		await controller.steamReturn(
			{
				user: {
					steamId: "76561198193621067",
					username: "Middle",
					avatarUrl: "https://avatars.test/full.jpg",
				},
				cookies: {
					steam_link_intent: "intent-1",
				},
			},
			res as never,
		);

		expect(steamAuthService.consumeLinkIntent).toHaveBeenCalledWith("intent-1");
		expect(steamAuthService.linkSteamAccount).toHaveBeenCalledWith(
			"local-user-1",
			"76561198193621067",
			"https://avatars.test/full.jpg",
		);
		expect(steamAuthService.loginWithSteam).not.toHaveBeenCalled();
		expect(clearCookie).toHaveBeenCalledWith("steam_link_intent", {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
		});
		expect(redirect).toHaveBeenCalledWith(
			302,
			"https://localhost/auth/callback?code=link-code-1",
		);
	});

	it("steamReturn throws if FRONTEND_URL is missing", async () => {
		steamAuthService.loginWithSteam.mockResolvedValue({ userId: "user-1" });
		steamAuthService.createCode.mockReturnValue("code-1");
		configService.get.mockReturnValue("");
		const res = {
			redirect: jest.fn(),
			clearCookie: jest.fn(),
		} as unknown as {
			redirect: jest.Mock;
			clearCookie: jest.Mock;
		};

		await expect(
			controller.steamReturn(
				{
					user: {
						steamId: "76561198193621067",
						username: "Middle",
						avatarUrl: "https://avatars.test/full.jpg",
					},
				},
				res as never,
			),
		).rejects.toThrow(InternalServerErrorException);
	});

	it("delegates exchangeCode to SteamAuthService", () => {
		steamAuthService.exchangeCode.mockReturnValue({ accessToken: "jwt-token" });

		const result = controller.exchangeCode({ code: "code-1" });

		expect(steamAuthService.exchangeCode).toHaveBeenCalledWith("code-1");
		expect(result).toEqual({ accessToken: "jwt-token" });
	});

	it("startSteamLink stores a short-lived intent in cookie then returns the Steam redirect target", () => {
		steamAuthService.createLinkIntent.mockReturnValue("intent-1");
		const cookie = jest.fn();
		const res = { cookie } as unknown as { cookie: jest.Mock };

		const result = controller.startSteamLink("local-user-1", res as never);

		expect(steamAuthService.createLinkIntent).toHaveBeenCalledWith("local-user-1");
		expect(cookie).toHaveBeenCalledWith("steam_link_intent", "intent-1", {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
			maxAge: 60_000,
		});
		expect(result).toEqual({ redirectUrl: "/api/auth/steam" });
	});
});
