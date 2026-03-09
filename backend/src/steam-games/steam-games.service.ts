import { BadRequestException, Injectable } from "@nestjs/common";
import { SteamOwnedGame } from "./types/steam-owned-game";
import { ConfigService } from "@nestjs/config";
import { URL } from "node:url";
import { SteamOwnedGameRaw, SteamOwnedGamesResponse, SteamRecentlyPlayedGameRaw, SteamRecentlyPlayedGamesResponse } from "./types/steam-api-response";

@Injectable()
export class SteamGamesService {
	constructor(
		private readonly configService: ConfigService,
	){}
	/**
	 * Fetches a user's Steam library and normalizes it to `SteamOwnedGame[]`.
	 *
	 * Flow:
	 * 1) Call `GetOwnedGames` for full ownership data.
	 * 2) Call `GetRecentlyPlayedGames` for recent activity.
	 * 3) Merge both payloads by `appid` to fill `playtimeMinutesLast2Weeks`.
	 *
	 * Guarantees:
	 * - Validates input `steamId` and `STEAM_API_KEY` presence.
	 * - Fails fast when Steam returns non-2xx responses.
	 * - Uses defensive fallbacks (`response?.games ?? []`) for partial payloads.
	 *
	 * @param steamId Steam 64-bit profile identifier.
	 * @returns Normalized list of owned Steam games.
	 * @throws BadRequestException on invalid input/config or upstream HTTP errors.
	 */

	async getOwnedGames(steamId: string): Promise<SteamOwnedGame[]>{
		const cleanSteamId = steamId.trim();
		if (cleanSteamId.length === 0)
			throw new BadRequestException("Steam ID is empty");
		const steamApiKey = this.configService.get<string>("STEAM_API_KEY");
		if (!steamApiKey)
			throw new BadRequestException("Empty API key");
		const getOwnedGamesUrl= new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
		const getRecentlyPlayedGamesUrl=  new URL("https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/");
		getOwnedGamesUrl.searchParams.set("key", steamApiKey);
		getOwnedGamesUrl.searchParams.set("steamid",cleanSteamId);
		getOwnedGamesUrl.searchParams.set("include_appinfo", "true");
		getOwnedGamesUrl.searchParams.set("include_played_free_games", "true");
		getRecentlyPlayedGamesUrl.searchParams.set("key", steamApiKey);
		getRecentlyPlayedGamesUrl.searchParams.set("steamid", cleanSteamId);
		const ownedGamesResponse = await fetch(getOwnedGamesUrl);
		if (!ownedGamesResponse.ok)
			throw new BadRequestException(`Couldn't export owned games (Steam HTTP ${ownedGamesResponse.status})`);
		const ownedGamesPayload: SteamOwnedGamesResponse = await ownedGamesResponse.json();
		const ownedGames: SteamOwnedGameRaw[] = ownedGamesPayload.response?.games ?? [];
		const recentlyPlayedResponse= await fetch(getRecentlyPlayedGamesUrl);
		if (!recentlyPlayedResponse.ok)
			throw new BadRequestException(`Couldn't export recently played games (Steam HTTP ${recentlyPlayedResponse.status})`);
		const recentlyPlayedPayload: SteamRecentlyPlayedGamesResponse = await recentlyPlayedResponse.json();
		const recentlyPlayedGames: SteamRecentlyPlayedGameRaw[] = recentlyPlayedPayload.response?.games ?? [];
		const map = new Map<string, number>();
		for (const recentGame of recentlyPlayedGames){
			const appId = recentGame.appid.toString();
			map.set(appId, recentGame.playtime_2weeks);
		}
		const normalizedOwnedGames: SteamOwnedGame[] = ownedGames.map((ownedGame): SteamOwnedGame=>{
			const appId = ownedGame.appid.toString();
			const iconHash = ownedGame.img_icon_url?.trim() ?? null;
			const iconUrl: string | null  = iconHash && iconHash.length > 0 ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${iconHash}.jpg` : null;
			const recentPlaytime = map.get(appId) ?? 0;
			return {
					appId: appId,
					name: ownedGame.name,
					playtimeMinutesForever: ownedGame.playtime_forever,
					playtimeMinutesLast2Weeks: recentPlaytime,
					iconUrl,
				}
			});
		return normalizedOwnedGames;
	}
}
