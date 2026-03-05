import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SteamAuthService } from "./steam-auth.service";

describe("AuthController", () => {
	let controller: AuthController;
	let authService: jest.Mocked<AuthService>;
	let steamAuthService: jest.Mocked<SteamAuthService>;

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
					},
				},
			],
		}).compile();

		controller = module.get(AuthController);
		authService = module.get(AuthService) as jest.Mocked<AuthService>;
		steamAuthService = module.get(SteamAuthService) as jest.Mocked<SteamAuthService>;
	});

	// Controller should just delegate register logic to AuthService.
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

	// Controller should just delegate login logic to AuthService.
	it("delegates login to AuthService", async () => {
		authService.login.mockResolvedValue({ accessToken: "token-login" });

		const result = await controller.login({
			email: "a@test.com",
			password: "Str0ngP@ssw0rd!",
		});

		expect(authService.login).toHaveBeenCalled();
		expect(result).toEqual({ accessToken: "token-login" });
	});

	// Steam callback payload must be forwarded as-is to SteamAuthService.
	it("delegates steam callback payload to SteamAuthService", async () => {
		steamAuthService.loginWithSteam.mockResolvedValue({ accessToken: "steam-token" });

		const result = await controller.steamReturn({
			user: {
				steamId: "76561198193621067",
				username: "Middle",
				avatarUrl: "https://avatars.test/full.jpg",
			},
		});

		expect(steamAuthService.loginWithSteam).toHaveBeenCalledWith(
			"76561198193621067",
			"Middle",
			"https://avatars.test/full.jpg",
		);
		expect(result).toEqual({ accessToken: "steam-token" });
	});
});
