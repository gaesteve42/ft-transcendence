export type SteamOwnedGameRaw = {
	appid: number,
	name: string,
	playtime_forever: number,
	img_icon_url?: string | null,
};

export type SteamRecentlyPlayedGameRaw = {
	appid: number,
	playtime_2weeks: number
};

export type SteamOwnedGamesResponse = {
	response: {
		games? : SteamOwnedGameRaw[],
		game_count?:  number,
	}
};

export type SteamRecentlyPlayedGamesResponse = {
	response: {
		games? : SteamRecentlyPlayedGameRaw[],
	}
};