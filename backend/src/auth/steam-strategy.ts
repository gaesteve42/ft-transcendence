import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-steam";
import { ConfigService } from "@nestjs/config";

type SteamProfileLite = {
	id : string;
	displayName: string;
	photos?: Array<{value: string}>;
}
@Injectable()
export class SteamStrategy extends PassportStrategy(Strategy, "steam"){
	constructor (
		config: ConfigService){
		const returnURL = config.get<string>("STEAM_RETURN_URL");
		const realm= config.get<string>("STEAM_REALM");
		const apiKey= config.get<string>("STEAM_API_KEY");

		if (!returnURL)
			throw new Error("STEAM_RETURN_URL is missing");
		if (!realm)
			throw new Error("STEAM_REALM is missing");
		if (!apiKey)
			throw new Error("STEAM_API_KEY is missing");
		super({ returnURL, realm, apiKey, providerURL:"https://steamcommunity.com/openid", } as any);
	}
	validate(_identifier: string,
		profile: SteamProfileLite,
		 done: (error: unknown, user?: {steamId: string; username: string; avatarUrl: string}) => void) : void {
			const steamId = profile.id;
			const username = profile.displayName;
			const avatarUrl = profile.photos?.[0]?.value ?? "";
			done(null, {steamId, username, avatarUrl})
		}	
}
