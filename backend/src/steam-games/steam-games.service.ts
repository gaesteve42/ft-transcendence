import { Injectable } from "@nestjs/common";
import { SteamOwnedGame } from "./types/steam-owned-game";

@Injectable()
export class SteamGamesService {
	async getOwnedGames(steamId: string): Promise<SteamOwnedGame[]>{

	}
}