import { ConfigService } from "@nestjs/config";
import { SteamStrategy } from "./steam-strategy";

describe("SteamStrategy", () => {
	const makeConfig = (values: Record<string, string | undefined>): ConfigService =>
		({
			get: (key: string): string | undefined => values[key],
		}) as ConfigService;

	it("throws when STEAM_RETURN_URL is missing", () => {
		const config = makeConfig({
			STEAM_RETURN_URL: undefined,
			STEAM_REALM: "http://localhost/",
			STEAM_API_KEY: "k",
		});

		expect(() => new SteamStrategy(config)).toThrow("STEAM_RETURN_URL is missing");
	});

	it("throws when STEAM_REALM is missing", () => {
		const config = makeConfig({
			STEAM_RETURN_URL: "http://localhost/api/auth/steam/return",
			STEAM_REALM: undefined,
			STEAM_API_KEY: "k",
		});

		expect(() => new SteamStrategy(config)).toThrow("STEAM_REALM is missing");
	});

	it("throws when STEAM_API_KEY is missing", () => {
		const config = makeConfig({
			STEAM_RETURN_URL: "http://localhost/api/auth/steam/return",
			STEAM_REALM: "http://localhost/",
			STEAM_API_KEY: undefined,
		});

		expect(() => new SteamStrategy(config)).toThrow("STEAM_API_KEY is missing");
	});

	it("maps steam profile to internal user payload", () => {
		const config = makeConfig({
			STEAM_RETURN_URL: "http://localhost/api/auth/steam/return",
			STEAM_REALM: "http://localhost/",
			STEAM_API_KEY: "k",
		});

		const strategy = new SteamStrategy(config);
		const done = jest.fn();

		strategy.validate(
			"https://steamcommunity.com/openid/id/76561198193621067",
			{
				id: "76561198193621067",
				displayName: "Middle",
				photos: [{ value: "https://avatars.test/full.jpg" }],
			},
			done,
		);

		expect(done).toHaveBeenCalledWith(null, {
			steamId: "76561198193621067",
			username: "Middle",
			avatarUrl: "https://avatars.test/full.jpg",
		});
	});
});
