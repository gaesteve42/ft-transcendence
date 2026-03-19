import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IgdbCatalogGame } from "./types/igdb-catalog-game";
import { IgdbGameDetails } from "./types/igdb-game-details";
import { IgdbGameTag } from "./types/igdb-game-tag";

@Injectable()
export class IgdbService {
	constructor(
		private readonly configService : ConfigService,
	){}
	private accessToken: string | null = null;
	private accessTokenExpiresAt: number | null = null;
	
	private mapCatalogItem(item: unknown): IgdbCatalogGame{	             
		if (item === null)
	                throw new InternalServerErrorException("Invalid IGDB catalog item format");
	            if (typeof item !== "object")
	                throw new InternalServerErrorException("Invalid IGDB catalog item format");
	            if (!("id" in item))
	                throw new InternalServerErrorException("Invalid IGDB catalog item format");
	            if (!("name" in item))
	                throw new InternalServerErrorException("Invalid IGDB catalog item format");
		const id = item.id;
		const name = item.name;
		let coverUrl: string | null = null;
		let summary: string | null = null;
		let firstReleaseDate: Date | null = null;
		if (typeof id !== "number")
			throw new InternalServerErrorException("Invalid IGDB catalog item format");
		if (typeof name !== "string")
			throw new InternalServerErrorException("Invalid IGDB catalog item format");
		if ("summary" in item) {
			if (typeof item.summary === "string")
			summary = item.summary;
		}
		if ("first_release_date" in item) {
			if (typeof item.first_release_date === "number")
			firstReleaseDate = new Date(item.first_release_date * 1000);
		}
		if ("cover" in item) {
			const cover = item.cover;
			if (
				cover !== null &&
				typeof cover === "object" &&
				"image_id" in cover &&
				typeof cover.image_id === "string"
			)
			coverUrl = this.buildCoverUrl(cover.image_id);
		}
		return {
			igdbId: id.toString(),
			name,
			summary,
			coverUrl,
			firstReleaseDate,
		};
 	}
	async searchCatalog(query: string, limit: number): Promise<IgdbCatalogGame[]>{
		const cleanQuery = query.trim();
		if (cleanQuery.length === 0)
			throw new BadRequestException("Query is required");
		if (!Number.isInteger(limit) || limit < 1 || limit > 25)
			throw new BadRequestException("Limit must be an integer between 1 and 25");
		const body = `fields id, name, summary, cover.image_id, first_release_date;
			search  "${cleanQuery}";
			limit ${limit};`
		const data = await this.fetchFromIgdb("games", body);
		if (!Array.isArray(data))
			throw new InternalServerErrorException("IGDB catalog response is not an array");
		return data.map((item) =>  this.mapCatalogItem(item));
	}
	private mapGameTags(value: unknown, prefix: "genre" | "theme" | "keyword"): IgdbGameTag[]{
		if (!Array.isArray(value))
			return [];
		const tags: IgdbGameTag[] = [];
		for (const item of value)
		{
			if (item === null || typeof item !== "object")
				continue;
			if (!("id" in item) || !("name" in item))
				continue;
			const id = item.id;
			const name = item.name;
			if (typeof id !== "number")
				continue;
			if (typeof name !== "string")
				continue;
			tags.push({
				externalTagId: `${prefix}:${id}`,
				label: name,
			});
		}
		return tags;
	}
	private mapGameModeNames(value: unknown): string[] {
		if (!Array.isArray(value))
			return [];
		const gameModeNames: string[] = [];
		for (const item of value){
			if (item === null || typeof item !== "object")
				continue;
			if (!("name" in item))
				continue;
			const name = item.name;
			if (typeof name !== "string")
				continue;
			gameModeNames.push(name);
		}
		return gameModeNames;
	}
	private supportsMultiplayerOrCoop(value: unknown): boolean {
		if (!Array.isArray(value))
			return false;
		for (const item of value) {
			if (item === null || typeof item !== "object")
				continue;
			const campaigncoop = "campaigncoop" in item ? item.campaigncoop : false;
			const onlinecoop = "onlinecoop" in item ? item.onlinecoop : false;
			const offlinecoop = "offlinecoop" in item ? item.offlinecoop : false;
			const onlinemax = "onlinemax" in item ? item.onlinemax : 0;
			const offlinemax = "offlinemax" in item ? item.offlinemax : 0;
			if (
				campaigncoop === true ||
				onlinecoop === true ||
				offlinecoop === true ||
				(typeof onlinemax === "number" && onlinemax > 1) ||
				(typeof offlinemax === "number" && offlinemax > 1)
			)
			return true;
		}
		return false;
	}

	private mapGameDetails(item: unknown): IgdbGameDetails{
		if (item === null)
	                throw new InternalServerErrorException("Invalid IGDB game details format");
	            if (typeof item !== "object")
	                throw new InternalServerErrorException("Invalid IGDB game details format");
	            if (!("id" in item))
	                throw new InternalServerErrorException("Invalid IGDB game details format");
	            if (!("name" in item))
	                throw new InternalServerErrorException("Invalid IGDB game details format");
		const id = item.id;
		const name = item.name;
		let coverUrl: string | null = null;
		let summary: string | null = null;
		let firstReleaseDate: Date | null = null;
		if (typeof id !== "number")
			throw new InternalServerErrorException("Invalid IGDB game details format");
		if (typeof name !== "string")
			throw new InternalServerErrorException("Invalid IGDB game details format");
		if ("summary" in item) {
			if (typeof item.summary === "string")
				summary = item.summary;
		}
		if ("first_release_date" in item) {
			if (typeof item.first_release_date === "number")
				firstReleaseDate = new Date(item.first_release_date * 1000);
		}
		if ("cover" in item) {
			const cover = item.cover;
			if (
				cover !== null &&
				typeof cover === "object" &&
				"image_id" in cover &&
				typeof cover.image_id === "string"
			)
			coverUrl = this.buildCoverUrl(cover.image_id);
		}
		const genres = "genres" in item ? this.mapGameTags(item.genres, "genre") : [];
		const themes = "themes" in item ? this.mapGameTags(item.themes, "theme") : [];
		const keywords = "keywords" in item ? this.mapGameTags(item.keywords, "keyword") : [];
		const gameModeNames = "game_modes" in item ? this.mapGameModeNames(item.game_modes) : [];
		const supportsMultiplayerOrCoop = "multiplayer_modes" in item ? this.supportsMultiplayerOrCoop(item.multiplayer_modes): false;
		return {
				igdbId: id.toString(),
				name,
				summary,
				coverUrl,
				firstReleaseDate,
				genres,
				themes,
				keywords,
				gameModeNames,
				supportsMultiplayerOrCoop,
			};
	}

	async getGameDetails(igdbId: string): Promise<IgdbGameDetails>{
		const cleanIgdbId = igdbId.trim();
		if (cleanIgdbId.length === 0)
			throw new BadRequestException("IGDB ID is required");
		const numericIgdbId = Number(cleanIgdbId);
		if ( !Number.isInteger(numericIgdbId)||numericIgdbId <= 0)
			throw new BadRequestException("IGDB ID must be a positive integer");
		const body = [
  				"fields id, name, summary, cover.image_id, first_release_date, genres.id, genres.name, themes.id, themes.name, keywords.id, keywords.name, game_modes.name, multiplayer_modes.campaigncoop, multiplayer_modes.onlinecoop, multiplayer_modes.offlinecoop, multiplayer_modes.onlinemax, multiplayer_modes.offlinemax;",
				`where id = ${numericIgdbId};`,
				"limit 1;",
				].join("\n");
		const data = await this.fetchFromIgdb("games", body);
		if (!Array.isArray(data))
			throw new InternalServerErrorException("IGDB game details response is not an array");
		if (data.length === 0)
			throw new NotFoundException("IGDB game not found");
		return this.mapGameDetails(data[0]);
	}
	/**
 	* Returns a cached Twitch access token when possible, or requests a new one for IGDB calls.
 	*/
	private async getAccessToken(): Promise<string>{
		// Reuse the in-memory token until it expires to avoid requesting a new Twitch token on every IGDB call.
		const token = this.accessToken;
		const expiresAt = this.accessTokenExpiresAt;
		if (token && expiresAt && Date.now() < expiresAt)
			return token;
		const clientId = this.configService.get<string>("TWITCH_CLIENT_ID");
		const clientSecret = this.configService.get<string>("TWITCH_CLIENT_SECRET");
		// Missing Twitch OAuth credentials is a server configuration issue, so we fail with a 500.
		if (!clientId || !clientSecret)
			throw new InternalServerErrorException("Twitch client ID or secret is missing");
		// Twitch uses the client credentials OAuth flow to issue a server-to-server access token for IGDB.
		const params = new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "client_credentials",
		});
		const requestUrl = `https://id.twitch.tv/oauth2/token?${params.toString()}`;
		const response = await fetch(requestUrl, {
			method: "POST",
		});
		if (!response.ok)
			throw new InternalServerErrorException("Failed to retrieve Twitch access token");
		// Treat the JSON response as unknown and validate its shape before trusting external data.
		const data: unknown = await response.json();
		if (data === null || typeof data !== "object")
			throw new InternalServerErrorException("Invalid Twitch token response format");
		if (!("access_token" in data) || !("expires_in" in data))
			throw new InternalServerErrorException("Invalid Twitch token response format")
		const accessToken = data.access_token;
		const expiresIn = data.expires_in;
		if (typeof accessToken !== "string" || typeof expiresIn !== "number")
			throw new InternalServerErrorException("Invalid Twitch token response format");
		if (accessToken.trim().length === 0 || !Number.isFinite(expiresIn) || expiresIn <= 0)
			throw new InternalServerErrorException("Invalid Twitch token payload");
		this.accessToken = accessToken;
		this.accessTokenExpiresAt = Date.now() + expiresIn * 1000;
		return accessToken;
	}
	private async fetchFromIgdb(endpoint: string, body: string): Promise<unknown>{
		const accessToken =  await this.getAccessToken();
		const clientId = this.configService.get<string>("TWITCH_CLIENT_ID");
		if (!clientId)
			throw new InternalServerErrorException("Twitch client ID is missing");
		const requestUrl = `https://api.igdb.com/v4/${endpoint}`;
		const response = await fetch(requestUrl, {
			method: "POST",
			headers:{
				"Client-ID": clientId,
				"Authorization": `Bearer ${accessToken}`,
				"Accept": "application/json",
			},
			body,
		});
		if (!response.ok)
			throw new InternalServerErrorException("Failed to fetch from IGDB API");
		const data: unknown = await response.json();
		return data;
	}
	private buildCoverUrl(imageId: string | null): string | null {
		const cleanImageId = imageId?.trim();
		if (!cleanImageId)
			return null;
		const coverUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${cleanImageId}.jpg`;
		return coverUrl;
	}

	/**
	 * Resolves a Steam app id to an IGDB game id through the `external_games` endpoint.
	 * This is the bridge that lets Steam imports later reuse IGDB metadata and tags.
	 */
	async getGameIdBySteamAppId(appId: string): Promise<string | null> {
		const cleanAppId = appId.trim();
		if (cleanAppId.length === 0)
			throw new BadRequestException("App ID is required");
		const body = [
				"fields game, uid, external_game_source;",
				`where external_game_source = 1 & uid = "${cleanAppId}";`,
				"limit 1;",
			].join("\n");
		const data = await this.fetchFromIgdb("external_games", body);
		if (!(Array.isArray(data)))
			throw new InternalServerErrorException("Data must be an array");
		if (data.length === 0)
			return null;
		const item = data[0];
		if (item === null || typeof item !== "object"){
			throw new InternalServerErrorException("Item must be an non-null object")
		}
		if (!("game" in item))
			throw new InternalServerErrorException("Game is required");
		const gameId = item.game;
		if (typeof gameId !== "number")
			throw new InternalServerErrorException("Game ID must be a number");
		return gameId.toString();
	}
	async getPopularMultiplayerGames(limit: number, offset: number) : Promise<IgdbGameDetails[]> {
		if (!Number.isInteger(limit) || limit <= 0 || limit > 500)
			throw new BadRequestException("Limit must be a positive integer between 1 and 500");
		if (!Number.isInteger(offset) || offset < 0)
			throw new BadRequestException("offset must be a positive integer");
		const body = [
  				"fields id, name, summary, cover.image_id, first_release_date, genres.id, genres.name, themes.id, themes.name, keywords.id, keywords.name, game_modes.name, multiplayer_modes.campaigncoop, multiplayer_modes.onlinecoop, multiplayer_modes.offlinecoop, multiplayer_modes.onlinemax, multiplayer_modes.offlinemax;",
				`where multiplayer_modes != null & total_rating_count > 3;`,
				"sort total_rating_count desc;",
				`limit ${limit};`,
				`offset ${offset};`,
				].join("\n");
		const data = await this.fetchFromIgdb("games", body);
		if (!Array.isArray(data))
			throw new InternalServerErrorException("IGDB game details response is not an array");
		return data.map((item) => this.mapGameDetails(item));
	}
}
