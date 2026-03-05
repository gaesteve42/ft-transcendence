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
		const res = { redirect } as unknown as { redirect: jest.Mock };

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
		expect(redirect).toHaveBeenCalledWith(
			302,
			"https://localhost/auth/callback?code=code-1",
		);
	});

	it("steamReturn throws if FRONTEND_URL is missing", async () => {
		steamAuthService.loginWithSteam.mockResolvedValue({ userId: "user-1" });
		steamAuthService.createCode.mockReturnValue("code-1");
		configService.get.mockReturnValue("");
		const res = { redirect: jest.fn() } as unknown as { redirect: jest.Mock };

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
});
