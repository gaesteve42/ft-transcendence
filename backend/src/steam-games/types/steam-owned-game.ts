export type SteamOwnedGame = {
	appId: string;
	name: string;
	playtimeMinutesForever: number;
	playtimeMinutesLast2Weeks: number;
	iconUrl: string | null;
};